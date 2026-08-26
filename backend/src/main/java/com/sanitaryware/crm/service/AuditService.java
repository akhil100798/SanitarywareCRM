package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditService {

    void logEvent(String action, String entityType, Long entityId, String details);

    void logEvent(String actorUsername, String action, String entityType, Long entityId, String details);

    Page<AuditLog> getAuditLogs(String entityType, Long entityId, Pageable pageable);
}
