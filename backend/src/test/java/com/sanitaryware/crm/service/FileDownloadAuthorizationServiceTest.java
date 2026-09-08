package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.ProductImageRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileDownloadAuthorizationServiceTest {

    @Mock
    private AccessControlService accessControlService;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @InjectMocks
    private FileDownloadAuthorizationService authorizationService;

    @Test
    void authorizeDownload_RejectsForeignSalesOrderAttachment() {
        Order order = new Order();
        when(orderRepository.findByBillPadImageUrl("billpads/foreign-order.png"))
                .thenReturn(Optional.of(order));
        doThrow(new AccessDeniedException("forbidden"))
                .when(accessControlService).requireOrderAccess(order);

        assertThrows(AccessDeniedException.class,
                () -> authorizationService.authorizeDownload("billpads", "foreign-order.png"));
    }

    @Test
    void authorizeDownload_AllowsOwnerOrderAttachment() {
        Order order = new Order();
        when(orderRepository.findByBillPadImageUrl("billpads/owner-order.png"))
                .thenReturn(Optional.of(order));

        assertDoesNotThrow(() -> authorizationService.authorizeDownload("billpads", "owner-order.png"));

        verify(accessControlService).requireOrderAccess(order);
    }

    @Test
    void authorizeDownload_RejectsUnassociatedFile() {
        when(orderRepository.findByBillPadImageUrl("billpads/missing.png")).thenReturn(Optional.empty());
        when(purchaseOrderRepository.findByInvoicePdfPath("billpads/missing.png")).thenReturn(Optional.empty());
        when(productImageRepository.findByImageUrl("/api/files/download/billpads/missing.png")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> authorizationService.authorizeDownload("billpads", "missing.png"));
    }

    @Test
    void authorizeDownload_AllowsManagementAccess() {
        when(accessControlService.hasManagementAccess()).thenReturn(true);

        assertDoesNotThrow(() -> authorizationService.authorizeDownload("general", "managed-file.png"));
    }
}
