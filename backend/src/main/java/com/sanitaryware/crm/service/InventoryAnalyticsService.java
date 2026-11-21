package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.DeadStockSummaryDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.InventoryHealthSummaryDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.LowStockAlertDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.ReorderSuggestionDTO;

import java.util.List;

public interface InventoryAnalyticsService {
    List<LowStockAlertDTO> getLowStockAlerts();
    List<ReorderSuggestionDTO> getReorderSuggestions();
    DeadStockSummaryDTO getDeadStockSummary();
    InventoryHealthSummaryDTO getInventoryHealthSummary();
}
