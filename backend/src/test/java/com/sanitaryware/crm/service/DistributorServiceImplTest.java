package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DistributorDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.DistributorMapper;
import com.sanitaryware.crm.repository.DistributorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistributorServiceImplTest {

    @Mock
    private DistributorRepository distributorRepository;

    @Mock
    private DistributorMapper distributorMapper;

    @Mock
    private AuditService auditService;

    private DistributorServiceImpl distributorService;

    @BeforeEach
    void setUp() {
        distributorService = new DistributorServiceImpl(distributorRepository, distributorMapper, auditService);
    }

    @Test
    void createDistributor_LogsAuditEvent() {
        DistributorDTO dto = new DistributorDTO();
        dto.setName("Apex Distributors");
        dto.setPhoneNumber("9876543210");

        Distributor entity = new Distributor();
        entity.setId(10L);
        entity.setName("Apex Distributors");
        entity.setPhoneNumber("9876543210");

        when(distributorMapper.toEntity(dto)).thenReturn(entity);
        when(distributorRepository.save(entity)).thenReturn(entity);
        when(distributorMapper.toDTO(entity)).thenReturn(dto);

        DistributorDTO result = distributorService.createDistributor(dto);

        assertNotNull(result);
        verify(auditService).logEvent(eq("CREATE"), eq("DISTRIBUTOR"), eq(10L), contains("Apex Distributors"));
    }

    @Test
    void deleteDistributor_WhenNotFound_ThrowsResourceNotFoundException() {
        when(distributorRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> distributorService.deleteDistributor(999L));
        verify(auditService, never()).logEvent(any(), any(), any(), any());
    }

    @Test
    void deleteDistributor_WhenFound_DeactivatesAndLogsAudit() {
        Distributor entity = new Distributor();
        entity.setId(5L);
        entity.setName("Ceramic Hub");
        entity.setIsActive(true);

        when(distributorRepository.findById(5L)).thenReturn(Optional.of(entity));

        distributorService.deleteDistributor(5L);

        assertFalse(entity.getIsActive());
        verify(distributorRepository).save(entity);
        verify(auditService).logEvent(eq("DEACTIVATE"), eq("DISTRIBUTOR"), eq(5L), contains("Ceramic Hub"));
    }

    @Test
    void toggleActiveStatus_WhenNotFound_ThrowsResourceNotFoundException() {
        when(distributorRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> distributorService.toggleActiveStatus(999L));
    }
}
