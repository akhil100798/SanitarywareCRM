package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
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

        // Manufacturer Lead Time Fields
        private Integer leadTimeDays;          // e.g. 21 for ceramic, 14 for brassware
        private Integer safetyBufferDays;      // e.g. 7 days buffer
        private Integer reorderPoint;          // (dailySalesVelocity * (leadTime + buffer)) + reorderLevel
        private Integer daysUntilReorderDeadline; // daysOfStockRemaining - leadTimeDays
        private String leadTimeUrgency;        // STOCKOUT_IMMINENT, ORDER_THIS_WEEK, HEALTHY
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeadStockItemDTO {
        private Long productId;
        private String productName;
        private String sku;
        private String brandName;
        private String categoryName;
        private String color;
        private String material;
        private Integer currentStock;
        private BigDecimal purchasePrice;
        private BigDecimal sellingPrice;
        private BigDecimal lockedCapital;      // currentStock * purchasePrice
        private BigDecimal monthlyCarryingCost;// lockedCapital * 0.02
        private Integer daysIdle;             // days since last sale or creation
        private String stagnationTier;         // DEAD_STOCK (>90d), SLOW_MOVING (60-90d), AT_RISK (45-60d)
        private LocalDate lastSoldDate;
        private String recommendedAction;      // AI recommendation for clearance / bundling
        private Integer suggestedDiscountPercent; // e.g. 25% markdown
        private String suggestedBundlePartner;  // e.g. High-velocity mixer or accessory
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeadStockSummaryDTO {
        private long totalDeadStockSkus;
        private long totalSlowMovingSkus;
        private long totalAtRiskSkus;
        private BigDecimal totalCapitalLocked;
        private BigDecimal totalMonthlyCarryingCost;
        private List<DeadStockItemDTO> items;
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
        private DeadStockSummaryDTO deadStockSummary;
    }
}
