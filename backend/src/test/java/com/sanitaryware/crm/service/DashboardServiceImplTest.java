package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DashboardDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private DistributorPaymentRepository distributorPaymentRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    void salesDashboardNeverQueriesOtherUsersRecentOrders() {
        var sales = new com.sanitaryware.crm.entity.User();
        sales.setUsername("sales-a");
        when(accessControlService.currentUser()).thenReturn(sales);
        when(accessControlService.isSales(sales)).thenReturn(true);
        when(orderRepository.findByCreatedByUsername(eq("sales-a"), any()))
                .thenReturn(new PageImpl<>(List.of()));

        assertTrue(dashboardService.getDashboardStats().getRecentOrders().isEmpty());
        org.mockito.Mockito.verify(orderRepository, org.mockito.Mockito.never()).findAll(any(PageRequest.class));
    }

    @Test
    void getDashboardStats_UsesAggregatesAndPreservesEmptyStatusBuckets() {
        when(paymentRepository.getTotalPaymentsBetweenDates(any(), any())).thenReturn(BigDecimal.valueOf(50000));
        when(orderRepository.count()).thenReturn(10L);
        when(orderRepository.countByStatus()).thenReturn(Collections.emptyList());
        when(customerRepository.count()).thenReturn(25L);
        when(productRepository.countByStockQuantityLessThan(10)).thenReturn(1L);
        when(distributorPaymentRepository.getTotalDistributorPaymentsBetweenDates(any(), any())).thenReturn(BigDecimal.ZERO);
        when(orderRepository.getTotalBalance()).thenReturn(BigDecimal.valueOf(125));
        when(orderRepository.findTopProductSales(eq(Order.OrderStatus.CANCELLED), any())).thenReturn(List.of());
        when(purchaseOrderRepository.getTotalBalance()).thenReturn(BigDecimal.valueOf(75));
        when(orderRepository.findAll(any(PageRequest.class))).thenReturn(new PageImpl<>(Collections.emptyList()));

        DashboardDTO stats = dashboardService.getDashboardStats();

        assertNotNull(stats);
        assertEquals(BigDecimal.valueOf(50000), stats.getTotalRevenue());
        assertEquals(10L, stats.getTotalOrders());
        assertEquals(25L, stats.getTotalCustomers());
        assertEquals(1L, stats.getLowStockProducts());
        assertEquals(BigDecimal.valueOf(125), stats.getTotalReceivables());
        assertEquals(BigDecimal.valueOf(75), stats.getTotalPayables());
        assertEquals(0L, stats.getPendingOrders());
        assertEquals(Order.OrderStatus.values().length, stats.getOrderStatusBreakdown().size());
        org.mockito.Mockito.verify(orderRepository, org.mockito.Mockito.never()).findAll();
        org.mockito.Mockito.verify(productRepository, org.mockito.Mockito.never()).findAll();
        assertNotNull(stats.getMonthlyRevenue());
        assertEquals(6, stats.getMonthlyRevenue().size());
        assertNotNull(stats.getTopProducts());
    }
}
