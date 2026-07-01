package com.sanitaryware.crm.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
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
public class QuotationDTO {
    private Long id;
    private String quotationNumber;
    
    @NotNull(message = "Customer ID is required")
    private Long customerId;
    
    private String customerName;
    private Long createdById;
    private String createdByName;
    private LocalDate quotationDate;
    
    @NotNull(message = "Valid until date is required")
    private LocalDate validUntil;
    
    private String status;
    private BigDecimal subtotal;
    private BigDecimal taxPercentage;
    private BigDecimal taxAmount;
    private BigDecimal discount;
    private BigDecimal total;
    private String notes;
    private String termsAndConditions;
    
    @NotNull(message = "Quotation items are required")
    @NotEmpty(message = "Quotation must contain at least one item")
    @Valid
    private List<QuotationItemDTO> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuotationItemDTO {
        private Long id;
        
        @NotNull(message = "Product is required")
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
