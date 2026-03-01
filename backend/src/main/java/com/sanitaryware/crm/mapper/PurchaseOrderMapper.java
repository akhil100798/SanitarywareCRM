package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.entity.PurchaseOrderItem;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class PurchaseOrderMapper {

    @Autowired
    private DistributorRepository distributorRepository;

    @Autowired
    private ProductRepository productRepository;

    public PurchaseOrderDTO toDTO(PurchaseOrder po) {
        if (po == null) return null;

        PurchaseOrderDTO dto = new PurchaseOrderDTO();
        dto.setId(po.getId());
        dto.setPoNumber(po.getPoNumber());
        dto.setDistributorId(po.getDistributor().getId());
        dto.setDistributorName(po.getDistributor().getName());
        dto.setOrderDate(po.getOrderDate());
        dto.setExpectedDeliveryDate(po.getExpectedDeliveryDate());
        dto.setReceivedDate(po.getReceivedDate());
        dto.setStatus(po.getStatus().name());
        dto.setSubtotal(po.getSubtotal());
        dto.setTaxPercentage(po.getTaxPercentage());
        dto.setTaxAmount(po.getTaxAmount());
        dto.setTotal(po.getTotal());
        dto.setPaidAmount(po.getPaidAmount());
        dto.setBalanceAmount(po.getBalanceAmount());
        dto.setInvoicePdfPath(po.getInvoicePdfPath());
        dto.setNotes(po.getNotes());

        if (po.getItems() != null) {
            dto.setItems(po.getItems().stream()
                    .map(this::toItemDTO)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    public PurchaseOrderDTO.PurchaseOrderItemDTO toItemDTO(PurchaseOrderItem item) {
        if (item == null) return null;

        PurchaseOrderDTO.PurchaseOrderItemDTO dto = new PurchaseOrderDTO.PurchaseOrderItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProduct().getId());
        dto.setProductName(item.getProduct().getName());
        dto.setProductSku(item.getProduct().getSku());
        dto.setQuantity(item.getQuantity());
        dto.setReceivedQuantity(item.getReceivedQuantity());
        dto.setUnitCost(item.getUnitCost());
        dto.setLineTotal(item.getLineTotal());
        dto.setNotes(item.getNotes());
        return dto;
    }

    public PurchaseOrder toEntity(PurchaseOrderDTO dto) {
        if (dto == null) return null;

        PurchaseOrder po = new PurchaseOrder();
        updateEntity(po, dto);
        return po;
    }

    public void updateEntity(PurchaseOrder po, PurchaseOrderDTO dto) {
        if (dto == null || po == null) return;

        po.setOrderDate(dto.getOrderDate());
        po.setExpectedDeliveryDate(dto.getExpectedDeliveryDate());
        po.setReceivedDate(dto.getReceivedDate());
        if (dto.getTaxPercentage() != null) po.setTaxPercentage(dto.getTaxPercentage());
        po.setInvoicePdfPath(dto.getInvoicePdfPath());
        po.setNotes(dto.getNotes());

        if (dto.getDistributorId() != null) {
            distributorRepository.findById(dto.getDistributorId())
                    .ifPresent(po::setDistributor);
        }
    }

    public PurchaseOrderItem toItemEntity(PurchaseOrderDTO.PurchaseOrderItemDTO dto, PurchaseOrder po) {
        if (dto == null) return null;

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setPurchaseOrder(po);
        item.setQuantity(dto.getQuantity());
        item.setReceivedQuantity(dto.getReceivedQuantity() != null ? dto.getReceivedQuantity() : 0);
        item.setUnitCost(dto.getUnitCost());
        item.setNotes(dto.getNotes());

        if (dto.getProductId() != null) {
            productRepository.findById(dto.getProductId())
                    .ifPresent(item::setProduct);
        }

        item.calculateLineTotal();
        return item;
    }
}
