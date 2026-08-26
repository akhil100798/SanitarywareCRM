package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.AuditLog;
import com.sanitaryware.crm.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceImplTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditServiceImpl auditService;

    @Test
    void logEvent_SavesAuditLogSuccessfully() {
        auditService.logEvent("qaadmin", "CREATE", "ORDER", 101L, "Created test order");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog saved = captor.getValue();
        assertEquals("qaadmin", saved.getActorUsername());
        assertEquals("CREATE", saved.getAction());
        assertEquals("ORDER", saved.getEntityType());
        assertEquals(101L, saved.getEntityId());
        assertEquals("Created test order", saved.getDetails());
    }

    @Test
    void getAuditLogs_FiltersByEntityAndId() {
        Pageable pageable = PageRequest.of(0, 10);
        AuditLog log = AuditLog.builder()
                .id(1L)
                .actorUsername("qaadmin")
                .action("UPDATE")
                .entityType("PRODUCT")
                .entityId(5L)
                .details("Updated price")
                .build();

        when(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(eq("PRODUCT"), eq(5L), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(log)));

        Page<AuditLog> result = auditService.getAuditLogs("PRODUCT", 5L, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("PRODUCT", result.getContent().get(0).getEntityType());
    }
}
