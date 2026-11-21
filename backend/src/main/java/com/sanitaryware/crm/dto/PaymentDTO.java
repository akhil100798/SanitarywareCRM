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
    private String customerName;
    private String paymentNumber;
    @jakarta.validation.constraints.PastOrPresent(message = "Payment date cannot be in the future")
    private LocalDate paymentDate;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @jakarta.validation.constraints.Digits(integer = 8, fraction = 2)
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
    @jakarta.validation.constraints.Size(max = 100)
    private String referenceNumber;
    private String notes;
    private Long receivedById;
    private String receivedByName;
    private LocalDateTime createdAt;
}
