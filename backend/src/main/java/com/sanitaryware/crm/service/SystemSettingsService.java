package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.SystemSettingsDTO;
import com.sanitaryware.crm.entity.SystemSettings;
import com.sanitaryware.crm.repository.SystemSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SystemSettingsService {

    private final SystemSettingsRepository systemSettingsRepository;

    public SystemSettingsDTO getSettings() {
        SystemSettings settings = systemSettingsRepository.findTopByOrderByIdAsc();
        if (settings == null) {
            settings = SystemSettings.builder()
                    .companyName("My Company")
                    .currencySymbol("₹")
                    .build();
            settings = systemSettingsRepository.save(settings);
        }
        return mapToDTO(settings);
    }

    public SystemSettingsDTO updateSettings(SystemSettingsDTO dto) {
        SystemSettings settings = systemSettingsRepository.findTopByOrderByIdAsc();
        if (settings == null) {
            settings = new SystemSettings();
        }

        settings.setCompanyName(dto.getCompanyName());
        settings.setAddress(dto.getAddress());
        settings.setCity(dto.getCity());
        settings.setState(dto.getState());
        settings.setPincode(dto.getPincode());
        settings.setPhone(dto.getPhone());
        settings.setEmail(dto.getEmail());
        settings.setWebsite(dto.getWebsite());
        settings.setGstNumber(dto.getGstNumber());
        settings.setCurrencySymbol(dto.getCurrencySymbol());
        settings.setLogoUrl(dto.getLogoUrl());

        return mapToDTO(systemSettingsRepository.save(settings));
    }

    private SystemSettingsDTO mapToDTO(SystemSettings entity) {
        return SystemSettingsDTO.builder()
                .id(entity.getId())
                .companyName(entity.getCompanyName())
                .address(entity.getAddress())
                .city(entity.getCity())
                .state(entity.getState())
                .pincode(entity.getPincode())
                .phone(entity.getPhone())
                .email(entity.getEmail())
                .website(entity.getWebsite())
                .gstNumber(entity.getGstNumber())
                .currencySymbol(entity.getCurrencySymbol())
                .logoUrl(entity.getLogoUrl())
                .build();
    }
}
