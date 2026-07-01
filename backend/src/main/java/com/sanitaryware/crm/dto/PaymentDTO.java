package com.sanitaryware.crm.dto;

import com.sanitaryware.crm.entity.Payment.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentDTO {
    private Long id;

    @NotNull(message = "Order ID is required")
    private Long orderId;

    private String orderNumber;
    private String paymentNumber;
    private LocalDate paymentDate;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
    private String referenceNumber;
    private String notes;
    private Long receivedById;
    private String receivedByName;
    private LocalDateTime createdAt;
}
