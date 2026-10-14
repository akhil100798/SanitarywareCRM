package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.dto.CatalogueCleanupResult;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QaCatalogueCleanupControllerTest {
    private final ProductService productService = mock(ProductService.class);
    private final QaCatalogueCleanupController controller = new QaCatalogueCleanupController(productService);

    @Test
    void cleanupRequiresAndReturnsTheSelectedBatch() {
        when(productService.cleanupCatalogueImports("qa-batch-17"))
                .thenReturn(new CatalogueCleanupResult("qa-batch-17", 3, 5, 0));

        var response = controller.cleanup("qa-batch-17");

        assertEquals(200, response.getStatusCode().value());
        assertEquals("qa-batch-17", response.getBody().batchId());
        assertEquals(3, response.getBody().deactivatedProducts());
        verify(productService).cleanupCatalogueImports("qa-batch-17");
    }

    @Test
    void cleanupEndpointRemainsQaDevOnlyAndAdminRestricted() throws Exception {
        assertArrayEquals(new String[]{"qa", "dev"}, QaCatalogueCleanupController.class.getAnnotation(Profile.class).value());
        var method = QaCatalogueCleanupController.class.getMethod("cleanup", String.class);
        assertTrue(method.getAnnotation(PreAuthorize.class).value().contains("ADMIN"));
        assertEquals("/{batchId}", method.getAnnotation(DeleteMapping.class).value()[0]);
    }
}
