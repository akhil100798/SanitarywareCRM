package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.SystemSettingsDTO;
import com.sanitaryware.crm.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SystemSettingsController {

    private final SystemSettingsService systemSettingsService;

    @GetMapping
    public ResponseEntity<SystemSettingsDTO> getSettings() {
        return ResponseEntity.ok(systemSettingsService.getSettings());
    }

    @PutMapping
    public ResponseEntity<SystemSettingsDTO> updateSettings(@RequestBody SystemSettingsDTO dto) {
        return ResponseEntity.ok(systemSettingsService.updateSettings(dto));
    }
}
