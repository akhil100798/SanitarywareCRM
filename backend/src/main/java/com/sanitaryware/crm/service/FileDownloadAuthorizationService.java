package com.sanitaryware.crm.service;

import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.ProductImageRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileDownloadAuthorizationService {

    private final AccessControlService accessControlService;
    private final OrderRepository orderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductImageRepository productImageRepository;

    public void authorizeDownload(String type, String fileName) {
        // Defence in depth: service callers also need a real current user.
        accessControlService.currentUser();
        // All CRM roles may read catalogue images, but never anonymously.
        if ("products".equals(type) || "products/catalogue".equals(type)) {
            return;
        }

        // Admin and Manager have upload rights and may download any managed file
        if (accessControlService.hasManagementAccess()) {
            return; // ADMIN or MANAGER — authorized
        }

        String storedPath = type + "/" + fileName;

        // SALES: may only download files linked to their own orders
        Optional<com.sanitaryware.crm.entity.Order> order = orderRepository.findByBillPadImageUrl(storedPath);
        if (order.isPresent()) {
            accessControlService.requireOrderAccess(order.get());
            return;
        }

        if (purchaseOrderRepository.findByInvoicePdfPath(storedPath).isPresent()) {
            accessControlService.requireManagementAccess();
            return;
        }

        String productImageUrl = "/api/files/download/" + storedPath;
        if (productImageRepository.findByImageUrl(productImageUrl).isPresent()) {
            return;
        }

        throw new ResourceNotFoundException("File not found");
    }
}
