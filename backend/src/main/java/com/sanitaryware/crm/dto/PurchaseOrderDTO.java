package com.sanitaryware.crm.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderDTO {
    private Long id;
    private String poNumber;
    private Long distributorId;
    private String distributorName;
    private LocalDate orderDate;
    private LocalDate expectedDeliveryDate;
    private LocalDate receivedDate;
    private String status;
    private BigDecimal subtotal;
    private BigDecimal taxPercentage;
    private BigDecimal taxAmount;
    private BigDecimal total;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private String invoicePdfPath;
    private String notes;
    @Valid
    private List<PurchaseOrderItemDTO> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseOrderItemDTO {
        private Long id;
        private Long productId;
        private String productName;
        private String productSku;
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
        @Min(value = 0, message = "Received quantity cannot be negative")
        private Integer receivedQuantity;
        @NotNull(message = "Unit cost is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Unit cost cannot be negative")
        private BigDecimal unitCost;
        private BigDecimal lineTotal;
        private String notes;
    }
}
