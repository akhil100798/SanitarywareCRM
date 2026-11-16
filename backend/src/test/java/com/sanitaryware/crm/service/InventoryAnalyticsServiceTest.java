package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.InventoryHealthSummaryDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.LowStockAlertDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.ReorderSuggestionDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryAnalyticsServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @InjectMocks
    private InventoryAnalyticsServiceImpl inventoryAnalyticsService;

    private Product p1;
    private Product p2;
    private Product p3;

    @BeforeEach
    void setUp() {
        Brand brand = new Brand();
        brand.setName("Jaquar");

        Category category = new Category();
        category.setName("Faucets");

        p1 = new Product();
        p1.setId(1L);
        p1.setName("Basin Mixer Premium");
        p1.setSku("JAQ-BM-01");
        p1.setStockQuantity(2);
        p1.setReorderLevel(10);
        p1.setPurchasePrice(new BigDecimal("1500.00"));
        p1.setBrand(brand);
        p1.setCategory(category);

        p2 = new Product();
        p2.setId(2L);
        p2.setName("Overhead Shower Chrome");
        p2.setSku("JAQ-OS-02");
        p2.setStockQuantity(0);
        p2.setReorderLevel(5);
        p2.setPurchasePrice(new BigDecimal("2200.00"));
        p2.setBrand(brand);
        p2.setCategory(category);

        p3 = new Product();
        p3.setId(3L);
        p3.setName("Wall Hung Commode");
        p3.setSku("JAQ-WC-03");
        p3.setStockQuantity(50);
        p3.setReorderLevel(10);
        p3.setPurchasePrice(new BigDecimal("8000.00"));
        p3.setBrand(brand);
        p3.setCategory(category);
    }

    @Test
    @DisplayName("getLowStockAlerts flags products at or below reorder level with urgency ranking")
    void testGetLowStockAlerts() {
        when(productRepository.findAll()).thenReturn(List.of(p1, p2, p3));

        List<LowStockAlertDTO> alerts = inventoryAnalyticsService.getLowStockAlerts();

        assertEquals(2, alerts.size());
        assertEquals("OUT_OF_STOCK", alerts.get(0).getUrgency()); // p2 has 0 stock
        assertEquals("JAQ-OS-02", alerts.get(0).getSku());
        assertEquals("CRITICAL", alerts.get(1).getUrgency()); // p1 has 2 stock <= 10/2
        assertEquals("JAQ-BM-01", alerts.get(1).getSku());
    }

    @Test
    @DisplayName("getReorderSuggestions calculates daily sales velocity and suggests order quantity")
    void testGetReorderSuggestions() {
        when(productRepository.findAll()).thenReturn(List.of(p1, p2, p3));

        OrderRepository.ProductSalesVelocity v1 = mock(OrderRepository.ProductSalesVelocity.class);
        when(v1.getProductId()).thenReturn(1L);
        when(v1.getTotalSold()).thenReturn(30L); // 1.0 unit/day

        when(orderRepository.findSalesVelocitySince(any(LocalDate.class), eq(Order.OrderStatus.CANCELLED)))
                .thenReturn(List.of(v1));

        List<ReorderSuggestionDTO> suggestions = inventoryAnalyticsService.getReorderSuggestions();

        assertFalse(suggestions.isEmpty());
        ReorderSuggestionDTO s1 = suggestions.stream().filter(s -> s.getProductId().equals(1L)).findFirst().orElseThrow();
        assertEquals(1.0, s1.getDailySalesVelocity());
        assertEquals(2, s1.getDaysOfStockRemaining());
        assertTrue(s1.getSuggestedReorderQuantity() >= 18);
        assertTrue(s1.getEstimatedTotalCost().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("getInventoryHealthSummary produces consolidated dashboard statistics")
    void testGetInventoryHealthSummary() {
        when(productRepository.findAll()).thenReturn(List.of(p1, p2, p3));
        when(productRepository.count()).thenReturn(3L);
        when(orderRepository.findSalesVelocitySince(any(), any())).thenReturn(List.of());

        InventoryHealthSummaryDTO summary = inventoryAnalyticsService.getInventoryHealthSummary();

        assertNotNull(summary);
        assertEquals(3L, summary.getTotalProducts());
        assertEquals(1L, summary.getHealthyStockCount()); // p3 only
        assertEquals(1L, summary.getLowStockCount()); // p1
        assertEquals(1L, summary.getOutOfStockCount()); // p2
    }
}
