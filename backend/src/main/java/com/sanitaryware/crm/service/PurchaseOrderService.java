package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PurchaseOrderService {
    PurchaseOrderDTO createPurchaseOrder(PurchaseOrderDTO purchaseOrderDTO);
    PurchaseOrderDTO updatePurchaseOrder(Long id, PurchaseOrderDTO purchaseOrderDTO);
    PurchaseOrderDTO getPurchaseOrderById(Long id);
    Page<PurchaseOrderDTO> getAllPurchaseOrders(Pageable pageable);
    void deletePurchaseOrder(Long id);
    PurchaseOrderDTO updateStatus(Long id, String status);
    List<PurchaseOrderDTO> getPurchaseOrdersByDistributor(Long distributorId);
    String generatePoNumber();
}
