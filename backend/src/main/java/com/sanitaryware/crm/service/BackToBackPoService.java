package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BackToBackPoPreviewDTO;
import com.sanitaryware.crm.dto.GenerateBackToBackPoRequestDTO;
import com.sanitaryware.crm.dto.PurchaseOrderDTO;

import java.util.List;

public interface BackToBackPoService {
    BackToBackPoPreviewDTO getBackToBackPreview(Long quotationId);
    List<PurchaseOrderDTO> generatePurchaseOrders(Long quotationId, GenerateBackToBackPoRequestDTO request);
}
