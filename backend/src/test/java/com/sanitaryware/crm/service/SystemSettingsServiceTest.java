package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.SystemSettingsDTO;
import com.sanitaryware.crm.entity.SystemSettings;
import com.sanitaryware.crm.repository.SystemSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SystemSettingsServiceTest {

    @Mock
    private SystemSettingsRepository systemSettingsRepository;

    @Mock
    private AuditService auditService;

    private SystemSettingsService systemSettingsService;

    @BeforeEach
    void setUp() {
        systemSettingsService = new SystemSettingsService(systemSettingsRepository, auditService);
    }

    @Test
    void getSettings_WhenExisting_ReturnsSettings() {
        SystemSettings existing = SystemSettings.builder()
                .id(1L)
                .companyName("Ceramic Studio")
                .currencySymbol("₹")
                .build();

        when(systemSettingsRepository.findTopByOrderByIdAsc()).thenReturn(existing);

        SystemSettingsDTO dto = systemSettingsService.getSettings();

        assertEquals("Ceramic Studio", dto.getCompanyName());
        assertEquals("₹", dto.getCurrencySymbol());
    }

    @Test
    void updateSettings_SavesAndLogsAuditEvent() {
        SystemSettings existing = SystemSettings.builder()
                .id(1L)
                .companyName("Old Name")
                .currencySymbol("₹")
                .build();

        when(systemSettingsRepository.findTopByOrderByIdAsc()).thenReturn(existing);
        when(systemSettingsRepository.save(any(SystemSettings.class))).thenAnswer(i -> i.getArgument(0));

        SystemSettingsDTO updateDTO = SystemSettingsDTO.builder()
                .companyName("New Ceramic Emporium")
                .currencySymbol("₹")
                .gstNumber("27ABCDE1234F1Z5")
                .build();

        SystemSettingsDTO result = systemSettingsService.updateSettings(updateDTO);

        assertEquals("New Ceramic Emporium", result.getCompanyName());
        verify(auditService).logEvent(eq("UPDATE"), eq("SYSTEM_SETTINGS"), eq(1L), contains("New Ceramic Emporium"));
    }
}
