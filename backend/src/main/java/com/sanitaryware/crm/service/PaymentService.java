package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PaymentDTO;
import java.util.List;

public interface PaymentService {
    PaymentDTO recordPayment(PaymentDTO paymentDTO);
    PaymentDTO getPaymentById(Long id);
    List<PaymentDTO> getPaymentsByOrder(Long orderId);
    List<PaymentDTO> getAllPayments();
    void deletePayment(Long id);
    String generatePaymentNumber();
}
