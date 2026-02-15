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
public class QuotationDTO {
    private Long id;
    private String quotationNumber;
    private Long customerId;
    private String customerName;
    private Long createdById;
    private String createdByName;
    private LocalDate quotationDate;
    private LocalDate validUntil;
    private String status;
    private BigDecimal subtotal;
    private BigDecimal taxPercentage;
    private BigDecimal taxAmount;
    private BigDecimal discount;
    private BigDecimal total;
    private String notes;
    private String termsAndConditions;
    private List<QuotationItemDTO> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuotationItemDTO {
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
