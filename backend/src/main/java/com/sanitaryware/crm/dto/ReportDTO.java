package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class ReportDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SalesSummaryReport {
        private BigDecimal totalSales;
        private long totalOrders;
        private BigDecimal totalTaxCollected;
        private BigDecimal totalDiscountGiven;
        private BigDecimal averageOrderValue;
        private List<SalesOrderSummary> orders;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SalesOrderSummary {
        private Long orderId;
        private String orderNumber;
        private LocalDate orderDate;
        private String customerName;
        private BigDecimal subtotal;
        private BigDecimal taxAmount;
        private BigDecimal discount;
        private BigDecimal total;
        private String status;
        private String paymentStatus;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerOutstandingReport {
        private BigDecimal totalOutstanding;
        private long totalCustomersWithBalance;
        private List<CustomerBalanceSummary> customers;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerBalanceSummary {
        private Long customerId;
        private String customerName;
        private String phoneNumber;
        private String company;
        private long totalOrders;
        private BigDecimal totalBilled;
        private BigDecimal totalPaid;
        private BigDecimal outstandingBalance;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DistributorOutstandingReport {
        private BigDecimal totalOutstanding;
        private long totalDistributorsWithBalance;
        private List<DistributorBalanceSummary> distributors;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DistributorBalanceSummary {
        private Long distributorId;
        private String distributorName;
        private String contactPerson;
        private String phoneNumber;
        private long totalPurchaseOrders;
        private BigDecimal totalPurchased;
        private BigDecimal totalPaid;
        private BigDecimal outstandingBalance;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentSummaryReport {
        private BigDecimal totalReceived;
        private long totalTransactions;
        private Map<String, BigDecimal> paymentMethodBreakdown;
        private List<PaymentTransactionSummary> recentTransactions;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentTransactionSummary {
        private Long paymentId;
        private String paymentNumber;
        private LocalDate paymentDate;
        private String orderNumber;
        private String customerName;
        private BigDecimal amount;
        private String paymentMethod;
        private String referenceNumber;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PurchaseSummaryReport {
        private BigDecimal totalPurchases;
        private long totalOrders;
        private BigDecimal totalPaid;
        private BigDecimal totalPayables;
        private long receivedOrdersCount;
        private List<PurchaseOrderSummary> purchaseOrders;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PurchaseOrderSummary {
        private Long poId;
        private String poNumber;
        private LocalDate orderDate;
        private String distributorName;
        private BigDecimal subtotal;
        private BigDecimal taxAmount;
        private BigDecimal total;
        private BigDecimal paidAmount;
        private BigDecimal balanceAmount;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InventorySummaryReport {
        private long totalProducts;
        private long activeProducts;
        private long totalStockQuantity;
        private BigDecimal totalInventoryValue;
        private long lowStockCount;
        private long outOfStockCount;
        private List<InventoryItemSummary> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InventoryItemSummary {
        private Long productId;
        private String productName;
        private String sku;
        private String barcode;
        private String hsnCode;
        private String brandName;
        private String categoryName;
        private int stockQuantity;
        private BigDecimal purchasePrice;
        private BigDecimal sellingPrice;
        private BigDecimal totalValue;
        private boolean isLowStock;
    }
}
