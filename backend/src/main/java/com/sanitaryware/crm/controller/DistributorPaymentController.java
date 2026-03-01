package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import com.sanitaryware.crm.service.DistributorPaymentService;
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

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorPaymentDTO> createPayment(@Valid @RequestBody DistributorPaymentDTO dto) {
        return ResponseEntity.ok(paymentService.createPayment(dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<DistributorPaymentDTO> getPaymentById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<DistributorPaymentDTO>> getAllPayments(Pageable pageable) {
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
