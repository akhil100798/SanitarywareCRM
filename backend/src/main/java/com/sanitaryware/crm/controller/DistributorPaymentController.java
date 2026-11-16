package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import com.sanitaryware.crm.service.DistributorPaymentService;
import com.sanitaryware.crm.web.PaginationFactory;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/distributor-payments")
@RequiredArgsConstructor
public class DistributorPaymentController {

    private final DistributorPaymentService paymentService;
    private final PaginationFactory paginationFactory;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorPaymentDTO> createPayment(@Valid @RequestBody DistributorPaymentDTO dto,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return ResponseEntity.ok(key == null ? paymentService.createPayment(dto) : paymentService.createPayment(dto, key));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorPaymentDTO> getPaymentById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<DistributorPaymentDTO>> getAllPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        Pageable pageable = paginationFactory.create(page, size, sort);
        return ResponseEntity.ok(paymentService.getAllPayments(pageable));
    }

    @GetMapping("/purchase-order/{poId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<DistributorPaymentDTO>> getPaymentsByPurchaseOrder(@PathVariable Long poId) {
        return ResponseEntity.ok(paymentService.getPaymentsByPurchaseOrder(poId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }
}
