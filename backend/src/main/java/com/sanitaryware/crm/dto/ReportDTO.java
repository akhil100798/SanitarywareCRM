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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GstTaxSummaryReport {
        private BigDecimal totalTaxableAmount;
        private BigDecimal totalCgst;
        private BigDecimal totalSgst;
        private BigDecimal totalIgst;
        private BigDecimal totalTax;
        private BigDecimal totalInvoiceAmount;
        private long totalInvoices;
        private List<GstHsnBreakdown> hsnBreakdowns;
        private List<GstInvoiceItem> invoices;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GstHsnBreakdown {
        private String hsnCode;
        private String description;
        private BigDecimal taxRate;
        private BigDecimal taxableAmount;
        private BigDecimal cgstAmount;
        private BigDecimal sgstAmount;
        private BigDecimal igstAmount;
        private BigDecimal totalTax;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GstInvoiceItem {
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private String customerName;
        private String gstin;
        private BigDecimal taxableAmount;
        private BigDecimal cgstAmount;
        private BigDecimal sgstAmount;
        private BigDecimal igstAmount;
        private BigDecimal totalTax;
        private BigDecimal invoiceTotal;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentAgingReport {
        private BigDecimal totalOutstanding;
        private long totalCustomers;
        private BigDecimal bucket0To30;
        private BigDecimal bucket31To60;
        private BigDecimal bucket61To90;
        private BigDecimal bucket90Plus;
        private List<CustomerAgingItem> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerAgingItem {
        private Long customerId;
        private String customerName;
        private String phoneNumber;
        private String customerType;
        private BigDecimal totalOutstanding;
        private BigDecimal bucket0To30;
        private BigDecimal bucket31To60;
        private BigDecimal bucket61To90;
        private BigDecimal bucket90Plus;
        private LocalDate oldestUnpaidInvoiceDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeadStockReport {
        private long totalDormantProducts;
        private long totalDormantStock;
        private BigDecimal totalDormantValue;
        private List<DeadStockItem> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeadStockItem {
        private Long productId;
        private String productName;
        private String sku;
        private String brandName;
        private String categoryName;
        private int currentStock;
        private BigDecimal unitPrice;
        private BigDecimal stockValue;
        private LocalDate lastSaleDate;
        private long daysDormant;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BrandMarginReport {
        private BigDecimal totalRevenue;
        private BigDecimal totalCost;
        private BigDecimal totalGrossMargin;
        private BigDecimal overallMarginPercentage;
        private List<BrandMarginItem> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BrandMarginItem {
        private Long brandId;
        private String brandName;
        private long unitsSold;
        private BigDecimal revenue;
        private BigDecimal costOfGoodsSold;
        private BigDecimal grossMargin;
        private BigDecimal marginPercentage;
    }
}
