package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import com.sanitaryware.crm.entity.DistributorPayment;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class DistributorPaymentMapper {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    public DistributorPaymentDTO toDTO(DistributorPayment payment) {
        if (payment == null) return null;

        DistributorPaymentDTO dto = new DistributorPaymentDTO();
        dto.setId(payment.getId());
        dto.setPurchaseOrderId(payment.getPurchaseOrder().getId());
        dto.setPoNumber(payment.getPurchaseOrder().getPoNumber());
        dto.setDistributorId(payment.getPurchaseOrder().getDistributor().getId());
        dto.setDistributorName(payment.getPurchaseOrder().getDistributor().getName());
        dto.setPaymentNumber(payment.getPaymentNumber());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setAmount(payment.getAmount());
        dto.setPaymentMethod(payment.getPaymentMethod().name());
        dto.setReferenceNumber(payment.getReferenceNumber());
        dto.setNotes(payment.getNotes());
        dto.setPaidById(payment.getPaidBy().getId());
        dto.setPaidByName(payment.getPaidBy().getFullName());
        return dto;
    }

    public DistributorPayment toEntity(DistributorPaymentDTO dto) {
        if (dto == null) return null;

        DistributorPayment payment = new DistributorPayment();
        payment.setPaymentDate(dto.getPaymentDate());
        payment.setAmount(dto.getAmount());
        if (dto.getPaymentMethod() != null) {
            payment.setPaymentMethod(DistributorPayment.PaymentMethod.valueOf(dto.getPaymentMethod()));
        }
        payment.setReferenceNumber(dto.getReferenceNumber());
        payment.setNotes(dto.getNotes());

        if (dto.getPurchaseOrderId() != null) {
            purchaseOrderRepository.findById(dto.getPurchaseOrderId())
                    .ifPresent(payment::setPurchaseOrder);
        }

        return payment;
    }
}
