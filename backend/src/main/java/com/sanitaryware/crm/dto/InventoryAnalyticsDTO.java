package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

public class InventoryAnalyticsDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockAlertDTO {
        private Long productId;
        private String productName;
        private String sku;
        private String brandName;
        private String categoryName;
        private Integer stockQuantity;
        private Integer reorderLevel;
        private Integer deficit;
        private String urgency; // OUT_OF_STOCK, CRITICAL, LOW
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderSuggestionDTO {
        private Long productId;
        private String productName;
        private String sku;
        private String brandName;
        private String categoryName;
        private Integer currentStock;
        private Integer reorderLevel;
        private Double dailySalesVelocity; // units sold per day over 30 days
        private Integer daysOfStockRemaining;
        private Integer suggestedReorderQuantity;
        private BigDecimal unitPurchasePrice;
        private BigDecimal estimatedTotalCost;
        private Long preferredDistributorId;
        private String preferredDistributorName;
        private String reorderReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryHealthSummaryDTO {
        private long totalProducts;
        private long healthyStockCount;
        private long lowStockCount;
        private long outOfStockCount;
        private BigDecimal totalReorderEstimatedCost;
        private List<LowStockAlertDTO> lowStockAlerts;
        private List<ReorderSuggestionDTO> reorderSuggestions;
    }
}
