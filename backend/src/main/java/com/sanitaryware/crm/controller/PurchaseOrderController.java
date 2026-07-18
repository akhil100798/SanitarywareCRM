package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import com.sanitaryware.crm.service.PurchaseOrderService;
import com.sanitaryware.crm.web.PaginationFactory;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final PaginationFactory paginationFactory;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PurchaseOrderDTO> createPurchaseOrder(@RequestBody @Valid PurchaseOrderDTO dto) {
        return ResponseEntity.ok(purchaseOrderService.createPurchaseOrder(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PurchaseOrderDTO> updatePurchaseOrder(@PathVariable Long id, @RequestBody @Valid PurchaseOrderDTO dto) {
        return ResponseEntity.ok(purchaseOrderService.updatePurchaseOrder(id, dto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PurchaseOrderDTO> getPurchaseOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrderById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Page<PurchaseOrderDTO>> getAllPurchaseOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        Pageable pageable = paginationFactory.create(page, size, sort);
        return ResponseEntity.ok(purchaseOrderService.getAllPurchaseOrders(pageable));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deletePurchaseOrder(@PathVariable Long id) {
        purchaseOrderService.deletePurchaseOrder(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PurchaseOrderDTO> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(purchaseOrderService.updateStatus(id, status));
    }

    @GetMapping("/distributor/{distributorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<PurchaseOrderDTO>> getPurchaseOrdersByDistributor(@PathVariable Long distributorId) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrdersByDistributor(distributorId));
    }
}
