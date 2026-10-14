package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.DistributorPaymentMapper;
import com.sanitaryware.crm.mapper.PurchaseOrderMapper;
import com.sanitaryware.crm.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;

/** Real repositories and service transactions; only the unused PDF renderer is mocked. */
@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"}, showSql = false)
@Import({PurchaseOrderServiceImpl.class, DistributorPaymentServiceImpl.class,
        PurchaseOrderMapper.class, DistributorPaymentMapper.class, AuditServiceImpl.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PurchasingIntegrityIntegrationTest {
    @Autowired PurchaseOrderService purchaseOrders;
    @Autowired DistributorPaymentService payments;
    @Autowired DistributorRepository distributors;
    @Autowired ProductRepository products;
    @Autowired BrandRepository brands;
    @Autowired CategoryRepository categories;
    @Autowired PurchaseOrderRepository poRepository;
    @Autowired AuditLogRepository auditLogs;
    @Autowired UserRepository users;
    @Autowired PlatformTransactionManager transactionManager;
    @MockBean PdfGeneratorService unusedPdfRenderer;
    Long distributorId;
    Long productId;
    String username;

    @BeforeEach void fixtures() {
        username = "buyer-" + UUID.randomUUID();
        new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
            String suffix = UUID.randomUUID().toString();
            User user = new User(); user.setUsername(username); user.setEmail(username + "@example.test");
            user.setFullName("Purchasing Regression"); user.setPassword("synthetic-non-login-hash");
            user.setRole(User.UserRole.ADMIN); users.save(user);
            Brand brand = new Brand(); brand.setName(suffix); brands.save(brand);
            Category category = new Category(); category.setName(suffix); categories.save(category);
            Distributor supplier = new Distributor(); supplier.setName(suffix); supplier.setPhoneNumber("9000000001");
            distributorId = distributors.save(supplier).getId();
            Product product = new Product(); product.setName(suffix); product.setSku(suffix);
            product.setBrand(brand); product.setCategory(category); product.setMrp(new BigDecimal("100"));
            product.setSellingPrice(new BigDecimal("100")); product.setStockQuantity(10);
            productId = products.save(product).getId();
        });
        authenticate();
    }

    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }
    private void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }
    private PurchaseOrderDTO request() {
        PurchaseOrderDTO dto = new PurchaseOrderDTO(); dto.setDistributorId(distributorId); dto.setStatus("DRAFT");
        dto.setOrderDate(java.time.LocalDate.now());
        PurchaseOrderDTO.PurchaseOrderItemDTO item = new PurchaseOrderDTO.PurchaseOrderItemDTO();
        item.setProductId(productId); item.setQuantity(2); item.setUnitCost(new BigDecimal("50"));
        dto.setItems(List.of(item)); return dto;
    }
    private Long create() { return purchaseOrders.createPurchaseOrder(request()).getId(); }
    private Long pay(Long poId, String amount) {
        DistributorPaymentDTO dto = new DistributorPaymentDTO(); dto.setPurchaseOrderId(poId);
        dto.setAmount(new BigDecimal(amount)); dto.setPaymentMethod("CASH");
        return payments.createPayment(dto).getId();
    }
    private void balance(String amount) {
        assertThat(distributors.findById(distributorId).orElseThrow().getOutstandingBalance()).isEqualByComparingTo(amount);
    }

    @Test void advanceThenReceiveCountsPaymentExactlyOnce() {
        Long po = create(); pay(po, "20"); balance("-20");
        purchaseOrders.receivePurchaseOrder(po); balance("80");
        assertThat(purchaseOrders.getPurchaseOrderById(po).getBalanceAmount()).isEqualByComparingTo("80");
    }
    @Test void receiveThenPartialPaymentUsesSameLedger() {
        Long po = create(); purchaseOrders.receivePurchaseOrder(po); pay(po, "20"); balance("80");
    }
    @Test void fullAdvanceAndDuplicateRequestCannotOverpay() {
        Long po = create(); pay(po, "100");
        assertThatThrownBy(() -> pay(po, "100")).isInstanceOf(IllegalArgumentException.class);
        purchaseOrders.receivePurchaseOrder(po); balance("0");
        assertThat(products.findById(productId).orElseThrow().getStockQuantity()).isEqualTo(12);
    }
    @Test void deletingAdvanceBeforeReceiptRestoresCredit() {
        Long po = create(); Long payment = pay(po, "20"); payments.deletePayment(payment); balance("0");
        purchaseOrders.receivePurchaseOrder(po); balance("100");
    }
    @Test void deletingPaymentAfterReceiptRestoresPayableOnlyOnce() {
        Long po = create(); Long payment = pay(po, "20"); purchaseOrders.receivePurchaseOrder(po);
        payments.deletePayment(payment); balance("100");
        assertThatThrownBy(() -> payments.deletePayment(payment)).isInstanceOf(ResourceNotFoundException.class);
        balance("100");
    }
    @Test void multipleOrdersAndPaymentsReconcile() {
        Long first = create(); Long second = create(); pay(first, "20"); pay(second, "30");
        purchaseOrders.receivePurchaseOrder(first); purchaseOrders.receivePurchaseOrder(second); balance("150");
        pay(first, "80"); pay(second, "70"); balance("0");
    }
    @Test void concurrentReceiptAndAdvanceReconcile() throws Exception {
        Long po = create(); ExecutorService workers = Executors.newFixedThreadPool(2); CountDownLatch start = new CountDownLatch(1);
        try {
            Future<?> receipt = workers.submit(() -> { authenticate(); await(start); purchaseOrders.receivePurchaseOrder(po); });
            Future<?> payment = workers.submit(() -> { authenticate(); await(start); pay(po, "20"); });
            start.countDown(); receipt.get(15, TimeUnit.SECONDS); payment.get(15, TimeUnit.SECONDS);
            balance("80"); assertThat(products.findById(productId).orElseThrow().getStockQuantity()).isEqualTo(12);
            assertThat(purchaseOrders.getPurchaseOrderById(po).getStatus()).isEqualTo("RECEIVED");
        } finally { workers.shutdownNow(); }
    }
    private static void await(CountDownLatch latch) {
        try { if (!latch.await(5, TimeUnit.SECONDS)) throw new AssertionError("Start barrier timed out"); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AssertionError(e); }
    }
    @Test void receivedCreationMustNotBypassInventory() {
        PurchaseOrderDTO dto = request(); dto.setStatus("RECEIVED");
        assertThatThrownBy(() -> purchaseOrders.createPurchaseOrder(dto)).isInstanceOf(IllegalArgumentException.class);
        assertThat(products.findById(productId).orElseThrow().getStockQuantity()).isEqualTo(10); balance("0");
    }
    @Test void receivedUpdateMustNotBypassInventory() {
        Long po = create(); PurchaseOrderDTO dto = request(); dto.setStatus("RECEIVED");
        assertThatThrownBy(() -> purchaseOrders.updatePurchaseOrder(po, dto)).isInstanceOf(IllegalArgumentException.class);
        assertThat(poRepository.findById(po).orElseThrow().getStatus()).isEqualTo(PurchaseOrder.POStatus.DRAFT);
        assertThat(products.findById(productId).orElseThrow().getStockQuantity()).isEqualTo(10); balance("0");
    }
    @Test void duplicateReceivingHasNoSecondStockLedgerOrAuditEffect() {
        Long po = create(); purchaseOrders.receivePurchaseOrder(po); long events = auditLogs.count();
        assertThatThrownBy(() -> purchaseOrders.receivePurchaseOrder(po)).isInstanceOf(ConflictException.class);
        assertThat(products.findById(productId).orElseThrow().getStockQuantity()).isEqualTo(12); balance("100");
        assertThat(auditLogs.count()).isEqualTo(events);
    }
    @Test void failedReceiptRollsBackEarlierStockAndAuditChanges() {
        Long po = create();
        new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
            PurchaseOrder order = poRepository.findById(po).orElseThrow();
            PurchaseOrderItem invalid = new PurchaseOrderItem(); invalid.setPurchaseOrder(order);
            invalid.setProduct(products.findById(productId).orElseThrow()); invalid.setQuantity(0);
            invalid.setUnitCost(BigDecimal.ONE); invalid.calculateLineTotal(); order.getItems().add(invalid);
        });
        long events = auditLogs.count();
        assertThatThrownBy(() -> purchaseOrders.receivePurchaseOrder(po)).isInstanceOf(IllegalArgumentException.class);
        assertThat(products.findById(productId).orElseThrow().getStockQuantity()).isEqualTo(10); balance("0");
        assertThat(poRepository.findById(po).orElseThrow().getStatus()).isEqualTo(PurchaseOrder.POStatus.DRAFT);
        assertThat(auditLogs.count()).isEqualTo(events);
    }
    @Test void detailUsesRealReadTransactionAndMissingIdIsNotFound() {
        Long po = create(); assertThat(purchaseOrders.getPurchaseOrderById(po).getItems()).hasSize(1);
        assertThatThrownBy(() -> purchaseOrders.getPurchaseOrderById(Long.MAX_VALUE)).isInstanceOf(ResourceNotFoundException.class);
    }
    @Test void deletingPaidDraftCannotLoseAdvanceHistory() {
        Long po = create(); pay(po, "20");
        assertThatThrownBy(() -> purchaseOrders.deletePurchaseOrder(po)).isInstanceOf(ConflictException.class);
        balance("-20"); assertThat(payments.getPaymentsByPurchaseOrder(po)).hasSize(1);
    }
    @Test void concurrentPaymentDeletionReversesExactlyOnce() throws Exception {
        Long po = create(); Long payment = pay(po, "20"); purchaseOrders.receivePurchaseOrder(po);
        ExecutorService workers = Executors.newFixedThreadPool(2); CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> reverse = () -> {
            authenticate(); await(start);
            try { payments.deletePayment(payment); return true; }
            catch (ResourceNotFoundException alreadyReversed) { return false; }
        };
        try {
            Future<Boolean> first = workers.submit(reverse); Future<Boolean> second = workers.submit(reverse);
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
            balance("100"); assertThat(purchaseOrders.getPurchaseOrderById(po).getPaidAmount()).isEqualByComparingTo("0");
        } finally { workers.shutdownNow(); }
    }
}
