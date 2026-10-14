package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DashboardDTO;
import com.sanitaryware.crm.dto.OrderDTO;
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
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(com.sanitaryware.crm.entity.User.UserRole.class)
    void recentOrderFinancialFieldsAreSerializedOnlyForManagementRoles(
            com.sanitaryware.crm.entity.User.UserRole role) throws Exception {
        var user = new com.sanitaryware.crm.entity.User();
        user.setUsername("dashboard-" + role.name().toLowerCase());
        user.setRole(role);
        when(accessControlService.currentUser()).thenReturn(user);

        Order order = new Order();
        OrderDTO fullOrder = new OrderDTO();
        fullOrder.setId(8L);
        fullOrder.setOrderNumber("ORD-8");
        fullOrder.setCustomerName("QA Customer");
        fullOrder.setStatus("PENDING");
        fullOrder.setSubtotal(new BigDecimal("100.00"));
        fullOrder.setTaxAmount(new BigDecimal("18.00"));
        fullOrder.setTotal(new BigDecimal("118.00"));
        fullOrder.setPaidAmount(new BigDecimal("18.00"));
        fullOrder.setBalanceAmount(new BigDecimal("100.00"));
        when(orderMapper.toDTO(order)).thenReturn(fullOrder);
        if (role == com.sanitaryware.crm.entity.User.UserRole.SALES) {
            when(accessControlService.isSales(user)).thenReturn(true);
            when(orderRepository.findByCreatedByUsername(eq(user.getUsername()), any()))
                    .thenReturn(new PageImpl<>(List.of(order)));
        } else {
            when(orderRepository.findAll(any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(order)));
        }

        DashboardDTO dashboard = dashboardService.getDashboardStats();
        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(dashboard);
        com.fasterxml.jackson.databind.JsonNode nestedOrder = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(json).path("recentOrders").get(0);

        assertNotNull(nestedOrder);
        assertEquals("ORD-8", nestedOrder.path("orderNumber").asText());
        boolean management = role == com.sanitaryware.crm.entity.User.UserRole.ADMIN
                || role == com.sanitaryware.crm.entity.User.UserRole.MANAGER;
        if (management) {
            assertEquals(0, new BigDecimal("118.00").compareTo(nestedOrder.path("total").decimalValue()));
        } else {
            for (String field : List.of("subtotal", "taxAmount", "total", "paidAmount", "balanceAmount")) {
                assertFalse(nestedOrder.has(field), "restricted dashboard order must omit " + field);
            }
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(value = com.sanitaryware.crm.entity.User.UserRole.class,
            names = {"SALES", "WAREHOUSE"})
    void nonManagementDashboardOmitsCompanyFinancials(com.sanitaryware.crm.entity.User.UserRole role) {
        var user = new com.sanitaryware.crm.entity.User(); user.setUsername("qa-test"); user.setRole(role);
        when(accessControlService.currentUser()).thenReturn(user);
        when(orderRepository.findAll(any(PageRequest.class))).thenReturn(new PageImpl<>(List.of()));
        DashboardDTO data = dashboardService.getDashboardStats();
        assertNull(data.getTotalRevenue());
        assertNull(data.getTotalReceivables());
        assertNull(data.getTotalPayables());
        assertNull(data.getDistributorPaymentsTotal());
        assertNull(data.getMonthlyRevenue());
        assertNull(data.getTopProducts());
        org.mockito.Mockito.verifyNoInteractions(paymentRepository, distributorPaymentRepository, purchaseOrderRepository);
    }

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
        var admin = new com.sanitaryware.crm.entity.User();
        admin.setRole(com.sanitaryware.crm.entity.User.UserRole.ADMIN);
        when(accessControlService.currentUser()).thenReturn(admin);
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
