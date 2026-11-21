package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.DeadStockSummaryDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.InventoryHealthSummaryDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.LowStockAlertDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.ReorderSuggestionDTO;
import com.sanitaryware.crm.service.InventoryAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory-analytics")
@RequiredArgsConstructor
public class InventoryAnalyticsController {

    private final InventoryAnalyticsService inventoryAnalyticsService;

    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'WAREHOUSE')")
    public ResponseEntity<List<LowStockAlertDTO>> getLowStockAlerts() {
        return ResponseEntity.ok(inventoryAnalyticsService.getLowStockAlerts());
    }

    @GetMapping("/reorder-suggestions")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'WAREHOUSE')")
    public ResponseEntity<List<ReorderSuggestionDTO>> getReorderSuggestions() {
        return ResponseEntity.ok(inventoryAnalyticsService.getReorderSuggestions());
    }

    @GetMapping("/dead-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'WAREHOUSE')")
    public ResponseEntity<DeadStockSummaryDTO> getDeadStockSummary() {
        return ResponseEntity.ok(inventoryAnalyticsService.getDeadStockSummary());
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'WAREHOUSE')")
    public ResponseEntity<InventoryHealthSummaryDTO> getInventoryHealthSummary() {
        return ResponseEntity.ok(inventoryAnalyticsService.getInventoryHealthSummary());
    }
}
