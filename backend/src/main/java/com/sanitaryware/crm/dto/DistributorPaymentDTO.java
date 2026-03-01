package com.sanitaryware.crm.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DistributorPaymentDTO {
    private Long id;
    private Long purchaseOrderId;
    private String poNumber;
    private Long distributorId;
    private String distributorName;
    private String paymentNumber;
    private LocalDate paymentDate;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    private String paymentMethod;
    private String referenceNumber;
    private String notes;
    private Long paidById;
    private String paidByName;
}
