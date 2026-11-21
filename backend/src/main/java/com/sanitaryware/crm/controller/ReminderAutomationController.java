package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.ReminderDTO.*;
import com.sanitaryware.crm.service.ReminderAutomationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/automation/reminders")
@RequiredArgsConstructor
public class ReminderAutomationController {

    private final ReminderAutomationService reminderAutomationService;

    @GetMapping("/preview")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<ReminderPreviewResponseDTO> getPendingRemindersPreview() {
        return ResponseEntity.ok(reminderAutomationService.getPendingRemindersPreview());
    }

    @PostMapping("/quotations/trigger")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<ReminderBatchExecutionResultDTO> triggerQuotationExpiryReminders() {
        return ResponseEntity.ok(reminderAutomationService.triggerQuotationExpiryReminders());
    }

    @PostMapping("/payments/trigger")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<ReminderBatchExecutionResultDTO> triggerPaymentBalanceReminders() {
        return ResponseEntity.ok(reminderAutomationService.triggerPaymentBalanceReminders());
    }

    @PostMapping("/trigger-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<ReminderBatchExecutionResultDTO> triggerAllReminders() {
        return ResponseEntity.ok(reminderAutomationService.triggerAllReminders());
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<List<ReminderLogItemDTO>> getReminderLogs() {
        return ResponseEntity.ok(reminderAutomationService.getReminderLogs());
    }
}
