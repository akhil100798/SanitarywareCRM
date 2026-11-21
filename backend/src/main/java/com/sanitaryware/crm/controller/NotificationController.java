package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.entity.NotificationDispatchLog;
import com.sanitaryware.crm.service.NotificationService;
import com.sanitaryware.crm.web.PaginationFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final PaginationFactory paginationFactory;

    @GetMapping("/logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<NotificationDispatchLog>> getDispatchLogs(
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false, defaultValue = "createdAt,desc") String[] sort) {

        Pageable pageable = paginationFactory.create(page, size, sort);
        return ResponseEntity.ok(notificationService.getDispatchLogs(channel, status, type, search, pageable));
    }

    @PostMapping("/retry/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<NotificationDispatchLog> retryDispatch(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.retryDispatch(id));
    }

    @PostMapping("/trigger/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> triggerLowStockAlerts() {
        return ResponseEntity.ok(notificationService.triggerLowStockAlerts());
    }

    @PostMapping("/trigger/payment-due")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> triggerPaymentDueReminders() {
        return ResponseEntity.ok(notificationService.triggerPaymentDueReminders());
    }
}
