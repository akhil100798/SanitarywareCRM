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
        if (payment.getPurchaseOrder() != null) {
            dto.setPurchaseOrderId(payment.getPurchaseOrder().getId());
            dto.setPoNumber(payment.getPurchaseOrder().getPoNumber());
            if (payment.getPurchaseOrder().getDistributor() != null) {
                dto.setDistributorId(payment.getPurchaseOrder().getDistributor().getId());
                dto.setDistributorName(payment.getPurchaseOrder().getDistributor().getName());
            }
        } else if (payment.getDistributor() != null) {
            dto.setDistributorId(payment.getDistributor().getId());
            dto.setDistributorName(payment.getDistributor().getName());
        }
        dto.setPaymentNumber(payment.getPaymentNumber());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setAmount(payment.getAmount());
        dto.setPaymentMethod(payment.getPaymentMethod().name());
        dto.setReferenceNumber(payment.getReferenceNumber());
        dto.setNotes(payment.getNotes());
        if (payment.getPaidBy() != null) {
            dto.setPaidById(payment.getPaidBy().getId());
            dto.setPaidByName(payment.getPaidBy().getFullName());
        }
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
