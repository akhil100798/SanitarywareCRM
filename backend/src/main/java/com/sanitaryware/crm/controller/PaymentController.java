package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.PaymentDTO;
import com.sanitaryware.crm.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<PaymentDTO> recordPayment(@Valid @RequestBody PaymentDTO paymentDTO) {
        return ResponseEntity.ok(paymentService.recordPayment(paymentDTO));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentDTO> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<PaymentDTO>> getPaymentsByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(paymentService.getPaymentsByOrder(orderId));
    }

    @GetMapping
    public ResponseEntity<List<PaymentDTO>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }
}
