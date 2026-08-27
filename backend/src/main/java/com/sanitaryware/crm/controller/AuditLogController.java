package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.entity.AuditLog;
import com.sanitaryware.crm.service.AuditService;
import com.sanitaryware.crm.web.PaginationFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditService auditService;
    private final PaginationFactory paginationFactory;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<AuditLog>> getAuditLogs(
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        String[] effectiveSort = (sort == null || sort.length == 0) ? new String[]{"createdAt,desc"} : sort;
        Pageable pageable = paginationFactory.create(page, size, effectiveSort);
        com.sanitaryware.crm.dto.AuditLogFilterDTO filter = com.sanitaryware.crm.dto.AuditLogFilterDTO.builder()
                .actor(actor)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .startDate(startDate)
                .endDate(endDate)
                .build();
        return ResponseEntity.ok(auditService.getAuditLogs(filter, pageable));
    }
}
