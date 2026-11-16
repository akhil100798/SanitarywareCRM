package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.InventoryHealthSummaryDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.LowStockAlertDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.ReorderSuggestionDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.service.InventoryAnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class InventoryAnalyticsControllerTest {

    @Mock
    private InventoryAnalyticsService inventoryAnalyticsService;

    @InjectMocks
    private InventoryAnalyticsController inventoryAnalyticsController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(inventoryAnalyticsController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    @DisplayName("GET /api/inventory-analytics/alerts returns low stock alert items")
    void testGetAlerts() throws Exception {
        LowStockAlertDTO alert = LowStockAlertDTO.builder()
                .productId(1L)
                .productName("Test Tap")
                .sku("TAP-01")
                .stockQuantity(1)
                .reorderLevel(10)
                .urgency("CRITICAL")
                .build();

        when(inventoryAnalyticsService.getLowStockAlerts()).thenReturn(List.of(alert));

        mockMvc.perform(get("/api/inventory-analytics/alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sku").value("TAP-01"))
                .andExpect(jsonPath("$[0].urgency").value("CRITICAL"));

        verify(inventoryAnalyticsService).getLowStockAlerts();
    }

    @Test
    @DisplayName("GET /api/inventory-analytics/reorder-suggestions returns suggestion list")
    void testGetReorderSuggestions() throws Exception {
        ReorderSuggestionDTO suggestion = ReorderSuggestionDTO.builder()
                .productId(1L)
                .productName("Test Tap")
                .sku("TAP-01")
                .suggestedReorderQuantity(25)
                .estimatedTotalCost(new BigDecimal("12500.00"))
                .build();

        when(inventoryAnalyticsService.getReorderSuggestions()).thenReturn(List.of(suggestion));

        mockMvc.perform(get("/api/inventory-analytics/reorder-suggestions")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].suggestedReorderQuantity").value(25));

        verify(inventoryAnalyticsService).getReorderSuggestions();
    }

    @Test
    @DisplayName("GET /api/inventory-analytics/summary returns overview metrics")
    void testGetSummary() throws Exception {
        InventoryHealthSummaryDTO summary = InventoryHealthSummaryDTO.builder()
                .totalProducts(50L)
                .healthyStockCount(42L)
                .lowStockCount(6L)
                .outOfStockCount(2L)
                .totalReorderEstimatedCost(new BigDecimal("84000.00"))
                .lowStockAlerts(List.of())
                .reorderSuggestions(List.of())
                .build();

        when(inventoryAnalyticsService.getInventoryHealthSummary()).thenReturn(summary);

        mockMvc.perform(get("/api/inventory-analytics/summary")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProducts").value(50))
                .andExpect(jsonPath("$.healthyStockCount").value(42));

        verify(inventoryAnalyticsService).getInventoryHealthSummary();
    }
}
