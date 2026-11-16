package com.sanitaryware.crm.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.UserRepository;
import com.sanitaryware.crm.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/** Opt-in real MySQL tests: mvn -Pmysql-it verify. Never substitutes H2. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("phase1-it")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class FinancialIntegrityMySqlIT {
    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtTokenProvider tokens;
    private String admin;
    private long adminId;
    private long brand;
    private long category;
    private final AtomicLong phone = new AtomicLong(7100000000L + Math.floorMod(System.nanoTime(), 100000000));

    @BeforeAll
    void setup() throws Exception {
        http.getRestTemplate().setRequestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory());
        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("MySQL");
            assertThat(connection.getCatalog()).startsWith("phase1_");
        }
        User user = user(User.UserRole.ADMIN);
        adminId = user.getId();
        admin = tokens.generateToken(user.getUsername(), "ADMIN");
        brand = ok("POST", "/api/brands", Map.of("name", unique("brand")), 201).get("id").asLong();
        category = ok("POST", "/api/categories", Map.of("name", unique("category")), 201).get("id").asLong();
        assertThat(jdbc.queryForObject("select count(*) from flyway_schema_history where version='11' and success=1", Integer.class)).isEqualTo(1);
    }

    @RepeatedTest(10)
    void competingPaymentsCannotOverpayOrLoseLedgerEntries() throws Exception {
        Fixture f = fixture(1000, 100);
        List<ResponseEntity<JsonNode>> responses = race("orders", f.order,
                () -> payment(f.order, 60, null), () -> payment(f.order, 60, null));
        assertThat(statuses(responses)).containsExactlyInAnyOrder(200, 400);
        reconciled(f.order, 60, 40);
        assertThat(countPayments(f.order)).isEqualTo(1);
    }

    @Test
    void identicalConcurrentKeyReturnsSameReceiptAndChangedPayloadIsRejected() throws Exception {
        Fixture f = fixture(10, 100);
        String key = unique("intent");
        List<ResponseEntity<JsonNode>> responses = race("orders", f.order,
                () -> payment(f.order, 60, key), () -> payment(f.order, 60, key));
        assertThat(statuses(responses)).containsExactly(200, 200);
        assertThat(responses.get(0).getBody()).isEqualTo(responses.get(1).getBody());
        assertThat(countPayments(f.order)).isEqualTo(1);
        assertThat(payment(f.order, 20, key).getStatusCode().value()).isEqualTo(409);
        reconciled(f.order, 60, 40);
    }

    @Test
    void databaseLockTimeoutReturnsControlledConflictAndNoPartialPayment() throws Exception {
        Fixture f = fixture(10, 100);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try (Connection blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var statement = blocker.prepareStatement("select id from orders where id=? for update")) {
                statement.setLong(1, f.order);
                try (var rows = statement.executeQuery()) { assertThat(rows.next()).isTrue(); }
            }
            Future<ResponseEntity<JsonNode>> result = executor.submit(() -> payment(f.order, 60, unique("timeout")));
            try {
                ResponseEntity<JsonNode> response = result.get(15, TimeUnit.SECONDS);
                assertThat(response.getStatusCode().value()).isEqualTo(409);
                assertThat(response.getBody().get("message").asText()).contains("retry");
            } finally { blocker.commit(); }
            assertThat(countPayments(f.order)).isZero();
            reconciled(f.order, 0, 100);
        } finally { executor.shutdownNow(); }
    }

    @Test
    void oneActorCannotReuseAKeyAcrossDifferentOrders() throws Exception {
        Fixture a = fixture(10, 100);
        Fixture b = fixture(10, 100);
        String key = unique("cross-order");
        List<ResponseEntity<JsonNode>> responses = race("users", adminId,
                () -> payment(a.order, 20, key), () -> payment(b.order, 20, key));
        assertThat(statuses(responses)).containsExactlyInAnyOrder(200, 409);
        assertThat(countPayments(a.order) + countPayments(b.order)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from payment_requests where actor_id=? and key_hash=sha2(?,256)", Integer.class, adminId, key)).isEqualTo(1);
    }

    @Test
    void keysAreActorScopedAndOwnershipStillApplies() {
        Fixture a = fixture(10, 100);
        User sales = user(User.UserRole.SALES);
        String salesToken = tokens.generateToken(sales.getUsername(), "SALES");
        String key = unique("actor-key");
        assertThat(payment(a.order, 20, key).getStatusCode().value()).isEqualTo(200);
        assertThat(request("POST", "/api/payments", paymentBody(a.order, 20), key, salesToken).getStatusCode().value()).isEqualTo(403);
        ResponseEntity<JsonNode> ownOrder = request("POST", "/api/orders", orderBody(a.customer, List.of(item(a.product, 1, 100)), "PENDING"), null, salesToken);
        assertThat(ownOrder.getStatusCode().value()).isEqualTo(200);
        long ownId = ownOrder.getBody().get("id").asLong();
        assertThat(request("POST", "/api/payments", paymentBody(ownId, 20), key, salesToken).getStatusCode().value()).isEqualTo(200);
        reconciled(ownId, 20, 80);
    }

    @Test
    void reversedPaymentCannotBeRecreatedByRetry() {
        Fixture f = fixture(10, 100);
        String key = unique("reversal");
        long receipt = payment(f.order, 60, key).getBody().get("id").asLong();
        ok("DELETE", "/api/payments/" + receipt, null, 204);
        assertThat(payment(f.order, 60, key).getStatusCode().value()).isEqualTo(409);
        assertThat(countPayments(f.order)).isZero();
        reconciled(f.order, 0, 100);
    }

    @Test
    void paymentAndReversalRaceAlwaysReconciles() throws Exception {
        Fixture f = fixture(10, 100);
        long receipt = payment(f.order, 60, unique("first")).getBody().get("id").asLong();
        List<ResponseEntity<JsonNode>> responses = race("orders", f.order,
                () -> request("DELETE", "/api/payments/" + receipt, null, null, admin),
                () -> payment(f.order, 60, unique("second")));
        assertThat(responses.get(0).getStatusCode().value()).isEqualTo(204);
        assertThat(responses.get(1).getStatusCode().value()).isIn(200, 400);
        BigDecimal ledger = ledger(f.order);
        assertThat(ledger).isBetween(BigDecimal.ZERO, new BigDecimal("100"));
        reconciled(f.order, ledger.intValueExact(), 100 - ledger.intValueExact());
    }

    @Test
    void paymentAndRepricingRaceCannotProduceNegativeBalance() throws Exception {
        Fixture f = fixture(10, 100);
        List<ResponseEntity<JsonNode>> responses = race("orders", f.order,
                () -> request("PUT", "/api/orders/" + f.order, Map.of("items", List.of(item(f.product, 1, 50))), null, admin),
                () -> payment(f.order, 60, null));
        assertThat(statuses(responses)).doesNotContain(500);
        if (responses.get(0).getStatusCode().value() == 200) {
            assertThat(responses.get(1).getStatusCode().value()).isEqualTo(400);
            reconciled(f.order, 0, 50);
        } else {
            assertThat(responses.get(0).getStatusCode().value()).isEqualTo(409);
            assertThat(responses.get(1).getStatusCode().value()).isEqualTo(200);
            reconciled(f.order, 60, 40);
        }
    }

    @Test
    void paymentStatusCannotOverrideLedgerAndPaidOrderCannotBeDeletedOrCancelled() {
        Fixture f = fixture(10, 100);
        ok("PATCH", "/api/orders/" + f.order + "/payment-status?status=PAID", null, 409);
        ok("PATCH", "/api/orders/" + f.order + "/payment-status?status=UNPAID", null, 200);
        assertThat(payment(f.order, 60, null).getStatusCode().value()).isEqualTo(200);
        ok("DELETE", "/api/orders/" + f.order, null, 409);
        ok("PATCH", "/api/orders/" + f.order + "/status?status=CANCELLED", null, 400);
        ok("PUT", "/api/orders/" + f.order, Map.of("items", List.of(item(f.product, 1, 10))), 409);
        reconciled(f.order, 60, 40);
    }

    @Test
    void inconsistentHistoricalHeaderIsRejectedWithoutSilentRepair() {
        Fixture f = fixture(10, 100);
        jdbc.update("update orders set paid_amount=10, balance_amount=90 where id=?", f.order);
        assertThat(payment(f.order, 20, null).getStatusCode().value()).isEqualTo(409);
        assertThat(countPayments(f.order)).isZero();
        assertThat(jdbc.queryForObject("select paid_amount from orders where id=?", BigDecimal.class, f.order)).isEqualByComparingTo("10");
    }

    @Test
    void putPatchCancellationAndRepeatedStatusesUseTheSameReservation() {
        Fixture f = fixture(1000, 100);
        ok("PUT", "/api/orders/" + f.order, Map.of("status", "CONFIRMED"), 200);
        assertStock(f.product, 999);
        ok("PATCH", "/api/orders/" + f.order + "/status?status=CONFIRMED", null, 200);
        assertStock(f.product, 999);
        ok("PUT", "/api/orders/" + f.order, Map.of("items", List.of(item(f.product, 2, 100), item(f.product, 3, 100))), 200);
        assertStock(f.product, 995);
        ok("PUT", "/api/orders/" + f.order, Map.of("status", "CANCELLED"), 200);
        assertStock(f.product, 1000);
        ok("PATCH", "/api/orders/" + f.order + "/status?status=CANCELLED", null, 200);
        assertStock(f.product, 1000);
    }

    @Test
    void duplicateLinesCannotOversellAndFailedReservationRollsBackAllProducts() {
        Fixture f = fixture(4, 100);
        ok("PUT", "/api/orders/" + f.order, Map.of("status", "CONFIRMED", "items", List.of(item(f.product, 2, 100), item(f.product, 3, 100))), 400);
        assertStock(f.product, 4);
        long empty = product(0);
        ok("PUT", "/api/orders/" + f.order, Map.of("status", "CONFIRMED", "items", List.of(item(f.product, 1, 100), item(empty, 1, 100))), 400);
        assertStock(f.product, 4);
        assertStock(empty, 0);
        assertThat(ok("GET", "/api/orders/" + f.order, null, 200).get("status").asText()).isEqualTo("PENDING");
    }

    @Test
    void competingOrdersCannotReserveTheSameLastUnit() throws Exception {
        Fixture f = fixture(1, 100);
        long second = ok("POST", "/api/orders", orderBody(f.customer, List.of(item(f.product, 1, 100)), "PENDING"), 200).get("id").asLong();
        List<ResponseEntity<JsonNode>> responses = race("products", f.product,
                () -> request("PATCH", "/api/orders/" + f.order + "/status?status=CONFIRMED", null, null, admin),
                () -> request("PATCH", "/api/orders/" + second + "/status?status=CONFIRMED", null, null, admin));
        assertThat(statuses(responses)).containsExactlyInAnyOrder(200, 400);
        assertStock(f.product, 0);
    }

    @Test
    void oppositeProductInputOrderStillUsesOrderedLocks() throws Exception {
        Fixture f = fixture(10, 100);
        long other = product(10);
        ok("PUT", "/api/orders/" + f.order, Map.of("items", List.of(item(other, 1, 100), item(f.product, 1, 100))), 200);
        long second = ok("POST", "/api/orders", orderBody(f.customer, List.of(item(f.product, 1, 100), item(other, 1, 100)), "PENDING"), 200).get("id").asLong();
        List<ResponseEntity<JsonNode>> responses = race("products", Math.min(f.product, other),
                () -> request("PATCH", "/api/orders/" + f.order + "/status?status=CONFIRMED", null, null, admin),
                () -> request("PATCH", "/api/orders/" + second + "/status?status=CONFIRMED", null, null, admin));
        assertThat(statuses(responses)).containsExactly(200, 200);
        assertStock(f.product, 8);
        assertStock(other, 8);
    }

    @Test
    void supplierAdvanceAndReceiptRaceHasOneLiabilityAndCorrectStock() throws Exception {
        SupplierFixture f = supplierFixture();
        List<ResponseEntity<JsonNode>> responses = race("distributors", f.distributor,
                () -> request("POST", "/api/purchase-orders/" + f.po + "/receive", null, null, admin),
                () -> request("POST", "/api/distributor-payments", supplierPayment(f.po, 60), unique("advance"), admin));
        assertThat(statuses(responses)).containsExactly(200, 200);
        assertStock(f.product, 11);
        assertSupplier(f, 60, 40);
    }

    @Test
    void duplicateSupplierPaymentsAndReceiptRequestsDoNotDoubleApply() throws Exception {
        SupplierFixture f = supplierFixture();
        List<ResponseEntity<JsonNode>> receipts = race("distributors", f.distributor,
                () -> request("POST", "/api/purchase-orders/" + f.po + "/receive", null, null, admin),
                () -> request("POST", "/api/purchase-orders/" + f.po + "/receive", null, null, admin));
        assertThat(statuses(receipts)).containsExactlyInAnyOrder(200, 409);
        String key = unique("supplier");
        List<ResponseEntity<JsonNode>> payments = race("distributors", f.distributor,
                () -> request("POST", "/api/distributor-payments", supplierPayment(f.po, 60), key, admin),
                () -> request("POST", "/api/distributor-payments", supplierPayment(f.po, 60), key, admin));
        assertThat(statuses(payments)).containsExactly(200, 200);
        assertThat(payments.get(0).getBody()).isEqualTo(payments.get(1).getBody());
        assertSupplier(f, 60, 40);
        assertStock(f.product, 11);
        long receipt = payments.get(0).getBody().get("id").asLong();
        ok("DELETE", "/api/distributor-payments/" + receipt, null, 204);
        assertSupplier(f, 0, 100);
        assertThat(request("POST", "/api/distributor-payments", supplierPayment(f.po, 60), key, admin).getStatusCode().value()).isEqualTo(409);
    }

    @Test
    void putPurchaseReceiptUsesReceiptWorkflowAndCannotReceiveTwice() {
        SupplierFixture f = supplierFixture();
        ok("PUT", "/api/purchase-orders/" + f.po, Map.of("status", "RECEIVED"), 200);
        assertStock(f.product, 11);
        ok("POST", "/api/purchase-orders/" + f.po + "/receive", null, 409);
        assertStock(f.product, 11);
        assertSupplier(f, 0, 100);
    }

    private List<ResponseEntity<JsonNode>> race(String table, long id,
            Supplier<ResponseEntity<JsonNode>> first, Supplier<ResponseEntity<JsonNode>> second) throws Exception {
        assertThat(Set.of("orders", "products", "users", "distributors")).contains(table);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (Connection blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var statement = blocker.prepareStatement("select id from " + table + " where id=? for update")) {
                statement.setLong(1, id);
                try (var rows = statement.executeQuery()) { assertThat(rows.next()).isTrue(); }
            }
            Future<ResponseEntity<JsonNode>> a = executor.submit(() -> { ready.countDown(); start.await(); return first.get(); });
            Future<ResponseEntity<JsonNode>> b = executor.submit(() -> { ready.countDown(); start.await(); return second.get(); });
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            try {
                // Prove both real server transactions are blocked in MySQL,
                // rather than assuming requests overlap after a timing sleep.
                await().atMost(Duration.ofSeconds(20)).until(() -> jdbc.queryForObject(
                        "select count(*) from performance_schema.data_lock_waits w join performance_schema.data_locks l "
                        + "on w.REQUESTING_ENGINE_LOCK_ID=l.ENGINE_LOCK_ID where l.OBJECT_SCHEMA=database() and l.OBJECT_NAME=?",
                        Integer.class, table) >= 2);
            } finally {
                blocker.commit();
            }
            return List.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }

    private User user(User.UserRole role) {
        User u = new User();
        u.setUsername(unique("it-user")); u.setEmail(unique("it") + "@example.test");
        u.setFullName("Phase 1 synthetic user"); u.setRole(role); u.setIsActive(true);
        u.setPassword(encoder.encode(UUID.randomUUID().toString()));
        return users.saveAndFlush(u);
    }
    private Fixture fixture(int stock, int price) {
        long customer = ok("POST", "/api/customers", Map.of("name", unique("customer"), "phoneNumber", Long.toString(phone.incrementAndGet()), "customerType", "RETAIL"), 201).get("id").asLong();
        long product = product(stock);
        long order = ok("POST", "/api/orders", orderBody(customer, List.of(item(product, 1, price)), "PENDING"), 200).get("id").asLong();
        return new Fixture(customer, product, order);
    }
    private long product(int stock) {
        return ok("POST", "/api/products", Map.of("sku", unique("sku"), "name", unique("product"), "mrp", 100, "sellingPrice", 100, "stockQuantity", stock, "brandId", brand, "categoryId", category), 201).get("id").asLong();
    }
    private SupplierFixture supplierFixture() {
        long distributor = ok("POST", "/api/distributors", Map.of("name", unique("supplier"), "phoneNumber", Long.toString(phone.incrementAndGet())), 201).get("id").asLong();
        long product = product(10);
        long po = ok("POST", "/api/purchase-orders", Map.of("distributorId", distributor, "orderDate", LocalDate.now().toString(), "items", List.of(Map.of("productId", product, "quantity", 1, "unitCost", 100))), 200).get("id").asLong();
        return new SupplierFixture(distributor, product, po);
    }
    private Map<String, Object> supplierPayment(long po, int amount) { return Map.of("purchaseOrderId", po, "amount", amount, "paymentMethod", "CASH"); }
    private Map<String, Object> paymentBody(long order, int amount) { return Map.of("orderId", order, "amount", amount, "paymentMethod", "CASH"); }
    private ResponseEntity<JsonNode> payment(long order, int amount, String key) { return request("POST", "/api/payments", paymentBody(order, amount), key, admin); }
    private Map<String, Object> item(long product, int quantity, int price) { return Map.of("productId", product, "quantity", quantity, "unitPrice", price); }
    private Map<String, Object> orderBody(long customer, List<Map<String, Object>> items, String status) { return Map.of("customerId", customer, "orderDate", LocalDate.now().toString(), "status", status, "items", items); }
    private JsonNode ok(String method, String path, Object body, int status) {
        ResponseEntity<JsonNode> response = request(method, path, body, null, admin);
        assertThat(response.getStatusCode().value()).as("%s %s: %s", method, path, response.getBody()).isEqualTo(status);
        return response.getBody();
    }
    private ResponseEntity<JsonNode> request(String method, String path, Object body, String key, String token) {
        HttpHeaders headers = new HttpHeaders(); headers.setBearerAuth(token); headers.setContentType(MediaType.APPLICATION_JSON);
        if (key != null) headers.set("Idempotency-Key", key);
        return http.exchange(path, HttpMethod.valueOf(method), new HttpEntity<>(body, headers), JsonNode.class);
    }
    private List<Integer> statuses(List<ResponseEntity<JsonNode>> responses) { return responses.stream().map(r -> r.getStatusCode().value()).toList(); }
    private int countPayments(long order) { return jdbc.queryForObject("select count(*) from payments where order_id=?", Integer.class, order); }
    private BigDecimal ledger(long order) { return jdbc.queryForObject("select coalesce(sum(amount),0) from payments where order_id=?", BigDecimal.class, order); }
    private void reconciled(long order, int paid, int balance) {
        JsonNode result = ok("GET", "/api/orders/" + order, null, 200);
        assertThat(result.get("paidAmount").decimalValue()).isEqualByComparingTo(Integer.toString(paid));
        assertThat(result.get("balanceAmount").decimalValue()).isEqualByComparingTo(Integer.toString(balance));
        assertThat(ledger(order)).isEqualByComparingTo(Integer.toString(paid));
        assertThat(result.get("paymentStatus").asText()).isEqualTo(paid == 0 ? "UNPAID" : balance == 0 ? "PAID" : "PARTIAL");
    }
    private void assertStock(long product, int stock) { assertThat(jdbc.queryForObject("select stock_quantity from products where id=?", Integer.class, product)).isEqualTo(stock); }
    private void assertSupplier(SupplierFixture f, int paid, int balance) {
        JsonNode po = ok("GET", "/api/purchase-orders/" + f.po, null, 200);
        assertThat(po.get("paidAmount").decimalValue()).isEqualByComparingTo(Integer.toString(paid));
        assertThat(po.get("balanceAmount").decimalValue()).isEqualByComparingTo(Integer.toString(balance));
        assertThat(jdbc.queryForObject("select outstanding_balance from distributors where id=?", BigDecimal.class, f.distributor)).isEqualByComparingTo(Integer.toString(balance));
        assertThat(jdbc.queryForObject("select coalesce(sum(amount),0) from distributor_payments where purchase_order_id=?", BigDecimal.class, f.po)).isEqualByComparingTo(Integer.toString(paid));
    }
    private String unique(String prefix) { return prefix + "-" + UUID.randomUUID().toString().substring(0, 12); }
    private record Fixture(long customer, long product, long order) {}
    private record SupplierFixture(long distributor, long product, long po) {}
}
