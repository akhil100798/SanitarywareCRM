package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.dto.CatalogueCleanupResult;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


/** QA/dev-only cleanup for products created by the PDF catalogue importer. */
@Profile({"qa", "dev"})
@RestController
@RequestMapping("/api/qa/catalogue-imports")
@RequiredArgsConstructor
public class QaCatalogueCleanupController {

    private final ProductService productService;

    @DeleteMapping("/{batchId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CatalogueCleanupResult> cleanup(@PathVariable String batchId) {
        return ResponseEntity.ok(productService.cleanupCatalogueImports(batchId));
    }
}
