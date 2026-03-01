package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.DashboardDTO;
import com.sanitaryware.crm.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<DashboardDTO> getDashboardStats() {
        return ResponseEntity.ok(dashboardService.getDashboardStats());
    }
}
