package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.AuditLog;
import com.sanitaryware.crm.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void logEvent(String action, String entityType, Long entityId, String details) {
        String actor = getCurrentUsername();
        logEvent(actor, action, entityType, entityId, details);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void logEvent(String actorUsername, String action, String entityType, Long entityId, String details) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .actorUsername(actorUsername != null ? actorUsername : "system")
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .details(details)
                    .build();
            auditLogRepository.save(auditLog);
            log.info("Audit logged: [{}] {} on {} #{} by {}", action, entityType, entityId, details, actorUsername);
        } catch (Exception e) {
            log.error("Failed to persist audit log for {} #{}: {}", entityType, entityId, e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(String entityType, Long entityId, Pageable pageable) {
        com.sanitaryware.crm.dto.AuditLogFilterDTO filter = com.sanitaryware.crm.dto.AuditLogFilterDTO.builder()
                .entityType(entityType)
                .entityId(entityId)
                .build();
        return getAuditLogs(filter, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(com.sanitaryware.crm.dto.AuditLogFilterDTO filter, Pageable pageable) {
        return auditLogRepository.findAll(com.sanitaryware.crm.repository.specification.AuditLogSpecification.withFilters(filter), pageable);
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        return "system";
    }
}
