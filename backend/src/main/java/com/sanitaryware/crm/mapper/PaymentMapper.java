package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.PaymentDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.User;

public class PaymentMapper {

    public static PaymentDTO toDTO(Payment payment) {
        if (payment == null) return null;

        return PaymentDTO.builder()
                .id(payment.getId())
                .orderId(payment.getOrder() != null ? payment.getOrder().getId() : null)
                .orderNumber(payment.getOrder() != null ? payment.getOrder().getOrderNumber() : null)
                .paymentNumber(payment.getPaymentNumber())
                .paymentDate(payment.getPaymentDate())
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod())
                .referenceNumber(payment.getReferenceNumber())
                .notes(payment.getNotes())
                .receivedById(payment.getReceivedBy() != null ? payment.getReceivedBy().getId() : null)
                .receivedByName(payment.getReceivedBy() != null ? payment.getReceivedBy().getFullName() : null)
                .createdAt(payment.getCreatedAt())
                .build();
    }

    public static Payment toEntity(PaymentDTO dto, Order order, User receivedBy) {
        if (dto == null) return null;

        Payment payment = new Payment();
        payment.setId(dto.getId());
        payment.setOrder(order);
        payment.setPaymentNumber(dto.getPaymentNumber());
        payment.setPaymentDate(dto.getPaymentDate());
        payment.setAmount(dto.getAmount());
        payment.setPaymentMethod(dto.getPaymentMethod());
        payment.setReferenceNumber(dto.getReferenceNumber());
        payment.setNotes(dto.getNotes());
        payment.setReceivedBy(receivedBy);

        return payment;
    }
}
