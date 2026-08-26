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
}
