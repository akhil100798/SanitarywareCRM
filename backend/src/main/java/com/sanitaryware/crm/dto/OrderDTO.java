package com.sanitaryware.crm.dto;

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
    private String shippingAddress;
    private String notes;
    private List<OrderItemDTO> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemDTO {
        private Long id;
        private Long productId;
        private String productName;
        private String productSku;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal discountPercentage;
        private BigDecimal lineTotal;
        private String notes;
    }
}
