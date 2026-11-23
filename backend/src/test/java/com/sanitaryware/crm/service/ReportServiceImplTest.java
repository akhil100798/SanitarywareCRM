package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.ReportDTO;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private DistributorRepository distributorRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ReportServiceImpl reportService;

    @Test
    void getSalesSummary_CalculatesAccurately() {
        Order order1 = new Order();
        order1.setId(1L);
        order1.setOrderNumber("ORD-1");
        order1.setOrderDate(LocalDate.now());
        order1.setSubtotal(BigDecimal.valueOf(1000));
        order1.setTaxAmount(BigDecimal.valueOf(180));
        order1.setDiscount(BigDecimal.valueOf(50));
        order1.setTotal(BigDecimal.valueOf(1130));
        order1.setStatus(Order.OrderStatus.CONFIRMED);

        Order order2 = new Order();
        order2.setId(2L);
        order2.setOrderNumber("ORD-2");
        order2.setOrderDate(LocalDate.now());
        order2.setSubtotal(BigDecimal.valueOf(2000));
        order2.setTaxAmount(BigDecimal.valueOf(360));
        order2.setDiscount(BigDecimal.ZERO);
        order2.setTotal(BigDecimal.valueOf(2360));
        order2.setStatus(Order.OrderStatus.DELIVERED);

        when(orderRepository.findAll()).thenReturn(List.of(order1, order2));

        ReportDTO.SalesSummaryReport report = reportService.getSalesSummary(null, null, null, null);

        assertNotNull(report);
        assertEquals(2, report.getTotalOrders());
        assertEquals(0, BigDecimal.valueOf(3490).compareTo(report.getTotalSales()));
        assertEquals(0, BigDecimal.valueOf(540).compareTo(report.getTotalTaxCollected()));
        assertEquals(0, BigDecimal.valueOf(50).compareTo(report.getTotalDiscountGiven()));
        assertEquals(0, BigDecimal.valueOf(1745.00).compareTo(report.getAverageOrderValue()));
    }

    @Test
    void getCustomerOutstanding_CalculatesCorrectBalances() {
        Customer c1 = new Customer();
        c1.setId(10L);
        c1.setName("Alice");
        c1.setPhoneNumber("9999999999");

        Order o1 = new Order();
        o1.setCustomer(c1);
        o1.setStatus(Order.OrderStatus.CONFIRMED);
        o1.setTotal(BigDecimal.valueOf(5000));
        o1.setPaidAmount(BigDecimal.valueOf(2000));
        o1.setBalanceAmount(BigDecimal.valueOf(3000));

        when(customerRepository.findAll()).thenReturn(List.of(c1));
        when(orderRepository.findByCustomerId(10L)).thenReturn(List.of(o1));

        ReportDTO.CustomerOutstandingReport report = reportService.getCustomerOutstanding(null);

        assertNotNull(report);
        assertEquals(1, report.getTotalCustomersWithBalance());
        assertEquals(0, BigDecimal.valueOf(3000).compareTo(report.getTotalOutstanding()));
        assertEquals("Alice", report.getCustomers().get(0).getCustomerName());
    }

    @Test
    void getDistributorOutstanding_CalculatesBalances() {
        Distributor d1 = new Distributor();
        d1.setId(20L);
        d1.setName("Best Pipes");
        d1.setOutstandingBalance(BigDecimal.valueOf(15000));

        PurchaseOrder po1 = new PurchaseOrder();
        po1.setDistributor(d1);
        po1.setStatus(PurchaseOrder.POStatus.RECEIVED);
        po1.setTotal(BigDecimal.valueOf(20000));
        po1.setPaidAmount(BigDecimal.valueOf(5000));

        when(distributorRepository.findAll()).thenReturn(List.of(d1));
        when(purchaseOrderRepository.findByDistributorId(20L)).thenReturn(List.of(po1));

        ReportDTO.DistributorOutstandingReport report = reportService.getDistributorOutstanding(null);

        assertNotNull(report);
        assertEquals(1, report.getTotalDistributorsWithBalance());
        assertEquals(0, BigDecimal.valueOf(15000).compareTo(report.getTotalOutstanding()));
    }

    @Test
    void getInventorySummary_CalculatesValueAndCounts() {
        Product p1 = new Product();
        p1.setId(1L);
        p1.setName("Basin");
        p1.setSku("BSN-1");
        p1.setStockQuantity(5); // Low stock (< 10)
        p1.setPurchasePrice(BigDecimal.valueOf(1200));
        p1.setIsActive(true);

        Product p2 = new Product();
        p2.setId(2L);
        p2.setName("Tap");
        p2.setSku("TAP-1");
        p2.setStockQuantity(20);
        p2.setPurchasePrice(BigDecimal.valueOf(500));
        p2.setIsActive(true);

        when(productRepository.findAll()).thenReturn(List.of(p1, p2));

        ReportDTO.InventorySummaryReport report = reportService.getInventorySummary(null, null);

        assertNotNull(report);
        assertEquals(2, report.getTotalProducts());
        assertEquals(2, report.getActiveProducts());
        assertEquals(25, report.getTotalStockQuantity());
        // Value = (5 * 1200) + (20 * 500) = 6000 + 10000 = 16000
        assertEquals(0, BigDecimal.valueOf(16000).compareTo(report.getTotalInventoryValue()));
        assertEquals(1, report.getLowStockCount());
    }

    @Test
    void getGstTaxSummary_CalculatesTaxesAndHsnBreakdown() {
        Order order = new Order();
        order.setId(10L);
        order.setOrderNumber("ORD-GST-1");
        order.setOrderDate(LocalDate.now());
        order.setSubtotal(BigDecimal.valueOf(10000));
        order.setTaxAmount(BigDecimal.valueOf(1800));
        order.setTotal(BigDecimal.valueOf(11800));
        order.setStatus(Order.OrderStatus.DELIVERED);

        Customer c = new Customer();
        c.setId(1L);
        c.setName("Test Builder");
        c.setGstNumber("27ABCDE1234F1Z5");
        order.setCustomer(c);

        OrderItem item = new OrderItem();
        item.setId(1L);
        item.setHsnCode("6910");
        item.setGstRate(BigDecimal.valueOf(18.0));
        item.setLineTotal(BigDecimal.valueOf(10000));
        order.setItems(List.of(item));

        when(orderRepository.findAll()).thenReturn(List.of(order));

        ReportDTO.GstTaxSummaryReport report = reportService.getGstTaxSummary(null, null);

        assertNotNull(report);
        assertEquals(1, report.getTotalInvoices());
        assertEquals(0, BigDecimal.valueOf(10000).compareTo(report.getTotalTaxableAmount()));
        assertEquals(0, BigDecimal.valueOf(1800).compareTo(report.getTotalTax()));
        assertEquals(0, BigDecimal.valueOf(900).compareTo(report.getTotalCgst()));
        assertEquals(0, BigDecimal.valueOf(900).compareTo(report.getTotalSgst()));
        assertEquals(1, report.getHsnBreakdowns().size());
        assertEquals("6910", report.getHsnBreakdowns().get(0).getHsnCode());
    }

    @Test
    void exportGstTaxSummary_CsvAndExcel_FormulasSanitized() {
        Order order = new Order();
        order.setId(11L);
        order.setOrderNumber("=cmd|'/C calc'!A0"); // Potential formula injection attempt
        order.setOrderDate(LocalDate.now());
        order.setSubtotal(BigDecimal.valueOf(5000));
        order.setTaxAmount(BigDecimal.valueOf(900));
        order.setTotal(BigDecimal.valueOf(5900));
        order.setStatus(Order.OrderStatus.CONFIRMED);

        Customer c = new Customer();
        c.setId(2L);
        c.setName("+Malicious Formula Name");
        c.setGstNumber("@27ATTACK");
        order.setCustomer(c);

        when(orderRepository.findAll()).thenReturn(List.of(order));

        byte[] csv = reportService.exportGstTaxSummary(null, null, "csv");
        String csvContent = new String(csv);
        // Formula injection guard prefixes dangerous leading characters with single quote
        assertTrue(csvContent.contains("''=cmd") || csvContent.contains("'=cmd"));
        assertTrue(csvContent.contains("'+Malicious"));
        assertTrue(csvContent.contains("'@27ATTACK"));

        byte[] excel = reportService.exportGstTaxSummary(null, null, "xlsx");
        assertNotNull(excel);
        assertTrue(excel.length > 0);
    }

    @Test
    void getPaymentAgingReport_CalculatesExactBuckets() {
        Customer c1 = new Customer();
        c1.setId(101L);
        c1.setName("Late Paying Contractor");
        c1.setPhoneNumber("9998887776");
        c1.setCustomerType(Customer.CustomerType.CONTRACTOR);

        when(customerRepository.findAll()).thenReturn(List.of(c1));

        Order o1 = new Order();
        o1.setId(1L);
        o1.setCustomer(c1);
        o1.setOrderDate(LocalDate.now().minusDays(15)); // 0-30 bucket
        o1.setTotal(BigDecimal.valueOf(20000));
        o1.setPaidAmount(BigDecimal.valueOf(5000));
        o1.setStatus(Order.OrderStatus.CONFIRMED);

        Order o2 = new Order();
        o2.setId(2L);
        o2.setCustomer(c1);
        o2.setOrderDate(LocalDate.now().minusDays(75)); // 61-90 bucket
        o2.setTotal(BigDecimal.valueOf(50000));
        o2.setPaidAmount(BigDecimal.valueOf(10000));
        o2.setStatus(Order.OrderStatus.DELIVERED);

        when(orderRepository.findAll()).thenReturn(List.of(o1, o2));

        ReportDTO.PaymentAgingReport report = reportService.getPaymentAgingReport(null);

        assertNotNull(report);
        assertEquals(1, report.getTotalCustomers());
        // Balance = (20000 - 5000) + (50000 - 10000) = 15000 + 40000 = 55000
        assertEquals(0, BigDecimal.valueOf(55000).compareTo(report.getTotalOutstanding()));
        assertEquals(1, report.getItems().size());
        ReportDTO.CustomerAgingItem item = report.getItems().get(0);
        assertEquals("CONTRACTOR", item.getCustomerType());
        assertEquals(0, BigDecimal.valueOf(55000).compareTo(item.getTotalOutstanding()));
    }

    @Test
    void getDeadStockReport_IdentifiesDormantInventory() {
        Product p = new Product();
        p.setId(201L);
        p.setName("Discontinued Ceramic Sink");
        p.setSku("SINK-DISC-1");
        p.setStockQuantity(15);
        p.setPurchasePrice(BigDecimal.valueOf(3000));

        when(productRepository.findAll()).thenReturn(List.of(p));
        when(orderRepository.findAll()).thenReturn(List.of()); // No sales ever

        ReportDTO.DeadStockReport report = reportService.getDeadStockReport(60);

        assertNotNull(report);
        assertEquals(1, report.getTotalDormantProducts());
        assertEquals(15, report.getTotalDormantStock());
        assertEquals(0, BigDecimal.valueOf(45000).compareTo(report.getTotalDormantValue()));
    }

    @Test
    void getBrandMarginReport_CalculatesGrossMargins() {
        Brand brand = new Brand();
        brand.setId(501L);
        brand.setName("Kohler Luxury");

        Product p = new Product();
        p.setId(301L);
        p.setName("Wall Hung Toilet");
        p.setBrand(brand);
        p.setPurchasePrice(BigDecimal.valueOf(15000));

        OrderItem item = new OrderItem();
        item.setId(1L);
        item.setProduct(p);
        item.setQuantity(2);
        item.setLineTotal(BigDecimal.valueOf(40000)); // Revenue = 40,000; Cost = 2 * 15,000 = 30,000

        Order order = new Order();
        order.setId(1L);
        order.setStatus(Order.OrderStatus.DELIVERED);
        order.setItems(List.of(item));

        when(orderRepository.findAll()).thenReturn(List.of(order));

        ReportDTO.BrandMarginReport report = reportService.getBrandMarginReport(null, null);

        assertNotNull(report);
        assertEquals(0, BigDecimal.valueOf(40000).compareTo(report.getTotalRevenue()));
        assertEquals(0, BigDecimal.valueOf(30000).compareTo(report.getTotalCost()));
        assertEquals(0, BigDecimal.valueOf(10000).compareTo(report.getTotalGrossMargin()));
        assertEquals(0, BigDecimal.valueOf(25.0).compareTo(report.getOverallMarginPercentage()));
    }
}
