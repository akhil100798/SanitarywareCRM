package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"}, showSql = false)
class DashboardQueriesTest {
    @Autowired private TestEntityManager em;
    @Autowired private OrderRepository orders;
    @Autowired private ProductRepository products;
    @Autowired private PurchaseOrderRepository purchases;
    @Autowired private DistributorPaymentRepository payments;

    @Test
    void emptyAggregatesReturnZeroAndNoProducts() {
        assertEquals(0, orders.getTotalBalance().signum());
        assertEquals(0, purchases.getTotalBalance().signum());
        assertEquals(0, payments.getTotalDistributorPaymentsBetweenDates(LocalDate.now(), LocalDate.now()).signum());
        assertEquals(0, products.countByStockQuantityLessThan(10));
        assertTrue(orders.countByStatus().isEmpty());
        assertTrue(orders.findTopProductSales(Order.OrderStatus.CANCELLED, PageRequest.of(0, 5)).isEmpty());
    }

    @Test
    void aggregatesRetainStatusNameGroupingBalanceAndDateSemantics() {
        User user = new User();
        user.setUsername("dashboard-test"); user.setEmail("dashboard@example.test");
        user.setFullName("Dashboard Test"); user.setPassword("unused-test-hash"); em.persist(user);
        Customer customer = new Customer();
        customer.setName("Customer"); customer.setPhoneNumber("1234567890"); em.persist(customer);
        Category category = new Category(); category.setName("Category"); em.persist(category);
        Brand brand = new Brand(); brand.setName("Brand"); em.persist(brand);
        Product first = product("A", "Same name", 5, category, brand);
        Product second = product("B", "Same name", 10, category, brand);
        Product third = product("C", "Other", 50, category, brand);
        order("A", Order.OrderStatus.PENDING, customer, user, first, 2, 30);
        order("B", Order.OrderStatus.CONFIRMED, customer, user, second, 3, 40);
        order("C", Order.OrderStatus.CANCELLED, customer, user, first, 100, -5);
        order("D", Order.OrderStatus.CONFIRMED, customer, user, third, 1, 10);

        Distributor distributor = new Distributor(); distributor.setName("Supplier");
        distributor.setPhoneNumber("1234567891"); em.persist(distributor);
        PurchaseOrder po = new PurchaseOrder(); po.setPoNumber("PO-1");
        po.setDistributor(distributor); po.setOrderDate(LocalDate.now());
        po.setBalanceAmount(BigDecimal.valueOf(-7)); em.persist(po);
        payment("start", user, LocalDate.now().minusDays(1), 10);
        payment("end", user, LocalDate.now(), 20);
        payment("outside", user, LocalDate.now().plusDays(1), 100);
        em.flush(); em.clear();

        assertEquals(1, products.countByStockQuantityLessThan(10));
        assertEquals(0, BigDecimal.valueOf(75).compareTo(orders.getTotalBalance()));
        assertEquals(0, BigDecimal.valueOf(-7).compareTo(purchases.getTotalBalance()));
        assertEquals(0, BigDecimal.valueOf(30).compareTo(payments.getTotalDistributorPaymentsBetweenDates(
                LocalDate.now().minusDays(1), LocalDate.now())));
        assertEquals(2L, orders.countByStatus().stream()
                .filter(row -> row.getStatus() == Order.OrderStatus.CONFIRMED).findFirst().orElseThrow().getCount());
        var top = orders.findTopProductSales(Order.OrderStatus.CANCELLED, PageRequest.of(0, 1));
        assertEquals(1, top.size());
        assertEquals("Same name", top.get(0).getProductName());
        assertEquals(5L, top.get(0).getQuantitySold());
        assertEquals(0, BigDecimal.valueOf(50).compareTo(top.get(0).getTotalRevenue()));
    }

    private Product product(String sku, String name, int stock, Category category, Brand brand) {
        Product product = new Product(); product.setSku(sku); product.setName(name);
        product.setStockQuantity(stock); product.setCategory(category); product.setBrand(brand);
        product.setMrp(BigDecimal.TEN); product.setSellingPrice(BigDecimal.TEN);
        return em.persist(product);
    }

    private void order(String number, Order.OrderStatus status, Customer customer, User user,
                       Product product, int quantity, int balance) {
        Order order = new Order(); order.setOrderNumber(number); order.setStatus(status);
        order.setOrderDate(LocalDate.now()); order.setCustomer(customer); order.setCreatedBy(user);
        order.setBalanceAmount(BigDecimal.valueOf(balance)); em.persist(order);
        OrderItem item = new OrderItem(); item.setOrder(order); item.setProduct(product);
        item.setQuantity(quantity); item.setUnitPrice(BigDecimal.TEN); em.persist(item);
    }

    private void payment(String number, User user, LocalDate date, int amount) {
        DistributorPayment payment = new DistributorPayment(); payment.setPaymentNumber(number);
        payment.setPaidBy(user); payment.setPaymentDate(date); payment.setAmount(BigDecimal.valueOf(amount));
        payment.setPaymentMethod(DistributorPayment.PaymentMethod.CASH); em.persist(payment);
    }
}
