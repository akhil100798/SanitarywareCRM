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
public class OrderDTO {
    private Long id;
    private String orderNumber;
    private Long customerId;
    private String customerName;
    private Long quotationId;
    private String quotationNumber;
    private Long createdById;
    private String createdByName;
    private LocalDate orderDate;
    private LocalDate deliveryDate;
    private String status;
    private String paymentStatus;
    private BigDecimal subtotal;
    private BigDecimal taxPercentage;
    private BigDecimal taxAmount;
    private BigDecimal discount;
    private BigDecimal shippingCharge;
    private BigDecimal total;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private String shippingAddress;
    private String notes;
    private String billPadImageUrl;
    @Valid
    private List<OrderItemDTO> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemDTO {
        private Long id;
        private Long productId;
        private String productName;
        private String productSku;
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.0", inclusive = true, message = "Unit price cannot be negative")
        private BigDecimal unitPrice;
        @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal discountPercentage;
        private BigDecimal lineTotal;
        private String notes;
    }
}
