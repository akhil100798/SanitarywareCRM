package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.service.QuotationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quotations")
public class QuotationController {

    @Autowired
    private QuotationService quotationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<QuotationDTO> createQuotation(@RequestBody @Valid QuotationDTO quotationDTO) {
        return ResponseEntity.ok(quotationService.createQuotation(quotationDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<QuotationDTO> updateQuotation(@PathVariable Long id, @RequestBody @Valid QuotationDTO quotationDTO) {
        return ResponseEntity.ok(quotationService.updateQuotation(id, quotationDTO));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<QuotationDTO> getQuotationById(@PathVariable Long id) {
        return ResponseEntity.ok(quotationService.getQuotationById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<Page<QuotationDTO>> getAllQuotations(Pageable pageable) {
        return ResponseEntity.ok(quotationService.getAllQuotations(pageable));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteQuotation(@PathVariable Long id) {
        quotationService.deleteQuotation(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<QuotationDTO> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(quotationService.updateStatus(id, status));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<List<QuotationDTO>> getQuotationsByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(quotationService.getQuotationsByCustomer(customerId));
    }
}
