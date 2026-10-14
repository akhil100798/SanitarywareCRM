package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/** Explicitly owned disposable fixtures only; the production deletion contract stays unchanged. */
@Profile("qa")
@RestController
@RequestMapping("/api/qa/quotations")
@RequiredArgsConstructor
public class QaFixtureCleanupController {
    private final QuotationRepository quotations;
    private final OrderRepository orders;

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestParam String customerName, Principal principal) {
        Quotation quotation = quotations.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QA quotation fixture not found"));
        if (!customerName.matches("(?:Legacy customer [a-f0-9-]+|Phase 1 Customer [0-9]+)")
                || !customerName.equals(quotation.getCustomer().getName())
                || !principal.getName().equals(quotation.getCreatedBy().getUsername())) {
            throw new ConflictException("Quotation is not an owned QA fixture");
        }
        if (orders.existsByQuotationId(id)) {
            throw new ConflictException("Remove the owned order before its QA quotation");
        }
        quotations.delete(quotation);
        return ResponseEntity.noContent().build();
    }
}
