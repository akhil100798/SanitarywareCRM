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
    private final com.sanitaryware.crm.service.WhatsAppService whatsAppService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<PaymentDTO> recordPayment(@Valid @RequestBody PaymentDTO paymentDTO,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return ResponseEntity.ok(key == null ? paymentService.recordPayment(paymentDTO)
                : paymentService.recordPayment(paymentDTO, key));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<PaymentDTO> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<List<PaymentDTO>> getPaymentsByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(paymentService.getPaymentsByOrder(orderId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<List<PaymentDTO>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/send-whatsapp")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES')")
    public ResponseEntity<com.sanitaryware.crm.dto.WhatsAppMessageResponse> sendPaymentWhatsApp(
            @PathVariable Long id,
            @RequestBody(required = false) com.sanitaryware.crm.dto.WhatsAppMessageRequest request) {
        String phone = request != null ? request.getPhoneNumber() : null;
        return ResponseEntity.ok(whatsAppService.sendPaymentReceipt(id, phone));
    }
}
