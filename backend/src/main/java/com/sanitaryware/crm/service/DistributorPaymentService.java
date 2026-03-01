package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DistributorPaymentService {
    DistributorPaymentDTO createPayment(DistributorPaymentDTO paymentDTO);
    DistributorPaymentDTO getPaymentById(Long id);
    Page<DistributorPaymentDTO> getAllPayments(Pageable pageable);
    List<DistributorPaymentDTO> getPaymentsByPurchaseOrder(Long purchaseOrderId);
    void deletePayment(Long id);
    String generatePaymentNumber();
}
