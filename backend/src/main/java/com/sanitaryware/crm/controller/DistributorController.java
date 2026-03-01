package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.DistributorDTO;
import com.sanitaryware.crm.service.DistributorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/distributors")
@RequiredArgsConstructor
public class DistributorController {

    private final DistributorService distributorService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorDTO> createDistributor(@RequestBody DistributorDTO dto) {
        return ResponseEntity.ok(distributorService.createDistributor(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorDTO> updateDistributor(@PathVariable Long id, @RequestBody DistributorDTO dto) {
        return ResponseEntity.ok(distributorService.updateDistributor(id, dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorDTO> getDistributorById(@PathVariable Long id) {
        return ResponseEntity.ok(distributorService.getDistributorById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<DistributorDTO>> getAllDistributors(
            Pageable pageable, 
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(distributorService.getAllDistributors(pageable, search));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<DistributorDTO>> getAllActiveDistributors() {
        return ResponseEntity.ok(distributorService.getAllActiveDistributors());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteDistributor(@PathVariable Long id) {
        distributorService.deleteDistributor(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorDTO> toggleActiveStatus(@PathVariable Long id) {
        return ResponseEntity.ok(distributorService.toggleActiveStatus(id));
    }
}
