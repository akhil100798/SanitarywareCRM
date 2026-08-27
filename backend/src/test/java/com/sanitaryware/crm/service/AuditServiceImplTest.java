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

        when(auditLogRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(log)));

        Page<AuditLog> result = auditService.getAuditLogs("PRODUCT", 5L, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("PRODUCT", result.getContent().get(0).getEntityType());
    }

    @Test
    void getAuditLogs_WithMultiFieldFilter_ReturnsMatchingPage() {
        Pageable pageable = PageRequest.of(0, 10);
        AuditLog log = AuditLog.builder()
                .id(2L)
                .actorUsername("qamanager")
                .action("RECEIVE_PO")
                .entityType("PURCHASE_ORDER")
                .entityId(15L)
                .details("Received PO")
                .build();

        when(auditLogRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(log)));

        com.sanitaryware.crm.dto.AuditLogFilterDTO filter = com.sanitaryware.crm.dto.AuditLogFilterDTO.builder()
                .actor("manager")
                .action("RECEIVE_PO")
                .entityType("PURCHASE_ORDER")
                .build();

        Page<AuditLog> result = auditService.getAuditLogs(filter, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("qamanager", result.getContent().get(0).getActorUsername());
    }
}
