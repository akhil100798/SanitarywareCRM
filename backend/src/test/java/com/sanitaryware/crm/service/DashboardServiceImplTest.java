package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DashboardDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
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

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    void getDashboardStats_NullStockQuantitiesAndEmptyOrders_ExecutesSafely() {
        Product p1 = new Product();
        p1.setId(1L);
        p1.setStockQuantity(null); // null stock check

        Product p2 = new Product();
        p2.setId(2L);
        p2.setStockQuantity(5); // low stock (<10)

        Product p3 = new Product();
        p3.setId(3L);
        p3.setStockQuantity(50); // normal stock (>=10)

        when(paymentRepository.getTotalPaymentsBetweenDates(any(), any())).thenReturn(BigDecimal.valueOf(50000));
        when(orderRepository.count()).thenReturn(10L);
        when(orderRepository.findByStatus(any(Order.OrderStatus.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(customerRepository.count()).thenReturn(25L);
        when(productRepository.findAll()).thenReturn(List.of(p1, p2, p3));
        when(distributorPaymentRepository.findAll()).thenReturn(Collections.emptyList());
        when(orderRepository.findAll()).thenReturn(Collections.emptyList());
        when(purchaseOrderRepository.findAll()).thenReturn(Collections.emptyList());
        when(orderRepository.findAll(any(PageRequest.class))).thenReturn(new PageImpl<>(Collections.emptyList()));

        DashboardDTO stats = dashboardService.getDashboardStats();

        assertNotNull(stats);
        assertEquals(BigDecimal.valueOf(50000), stats.getTotalRevenue());
        assertEquals(10L, stats.getTotalOrders());
        assertEquals(25L, stats.getTotalCustomers());
        assertEquals(1L, stats.getLowStockProducts()); // only p2 has stock < 10
    }
}
