package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.CatalogImportPreviewResponse;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.ProductFilterDTO;
import com.sanitaryware.crm.dto.ProductImageDTO;
import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.web.PaginationFactory;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.sanitaryware.crm.dto.CatalogJobProgressDTO;
import com.sanitaryware.crm.service.CatalogJobService;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final PaginationFactory paginationFactory;
    private final CatalogJobService catalogJobService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductDTO productDTO) {
        return new ResponseEntity<>(productService.createProduct(productDTO), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductDTO productDTO) {
        return ResponseEntity.ok(productService.updateProduct(id, productDTO));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<Page<ProductDTO>> getAllProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) Boolean lowStock,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isAvailable,
            @RequestParam(required = false) String barcode,
            @RequestParam(required = false) String hsnCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        Pageable pageable = paginationFactory.create(page, size, sort);
        ProductFilterDTO filter = ProductFilterDTO.builder()
                .query(query)
                .categoryId(categoryId)
                .brandId(brandId)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .inStock(inStock)
                .lowStock(lowStock)
                .isActive(isActive)
                .isAvailable(isAvailable)
                .barcode(barcode)
                .hsnCode(hsnCode)
                .build();
        return ResponseEntity.ok(productService.getProductsWithFilters(filter, pageable));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<Page<ProductDTO>> searchProducts(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        Pageable pageable = paginationFactory.create(page, size, sort);
        return ResponseEntity.ok(productService.searchProducts(query, pageable));
    }

    @GetMapping("/category/{categoryId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<Page<ProductDTO>> getProductsByCategory(
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        Pageable pageable = paginationFactory.create(page, size, sort);
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId, pageable));
    }

    @GetMapping("/brand/{brandId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<Page<ProductDTO>> getProductsByBrand(
            @PathVariable Long brandId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        Pageable pageable = paginationFactory.create(page, size, sort);
        return ResponseEntity.ok(productService.getProductsByBrand(brandId, pageable));
    }

    @GetMapping("/barcode/{barcode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<ProductDTO> getProductByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(productService.getProductByBarcode(barcode));
    }

    @GetMapping("/hsn/{hsnCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<Page<ProductDTO>> getProductsByHsnCode(
            @PathVariable String hsnCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String[] sort) {
        Pageable pageable = paginationFactory.create(page, size, sort);
        return ResponseEntity.ok(productService.getProductsByHsnCode(hsnCode, pageable));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<List<ProductDTO>> getLowStockProducts() {
        return ResponseEntity.ok(productService.getLowStockProducts());
    }

    @GetMapping("/featured")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<List<ProductDTO>> getFeaturedProducts() {
        return ResponseEntity.ok(productService.getFeaturedProducts());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'WAREHOUSE')")
    public ResponseEntity<Void> updateStock(
            @PathVariable Long id,
            @RequestParam Integer quantity,
            @RequestParam(required = false, defaultValue = "MANUAL_ADJUSTMENT") String reason,
            @RequestParam(required = false) String rmaCode) {
        productService.updateStock(id, quantity, reason, rmaCode);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/availability")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<com.sanitaryware.crm.dto.ProductDTO> updateAvailability(
            @PathVariable Long id, @RequestParam boolean available) {
        return ResponseEntity.ok(productService.updateProductAvailability(id, available));
    }

    @PostMapping("/bulk-catalog-upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<BulkUploadResponse> bulkCatalogUpload(
            @RequestParam("brandId") Long brandId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("previewSha256") String previewSha256,
            @RequestParam(value = "selectedSkus", required = false) List<String> selectedSkus,
            @RequestParam(value = "unavailableSkus", required = false) List<String> unavailableSkus,
            @RequestParam(defaultValue = "false") boolean confirmed) {
        if (!confirmed) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.PRECONDITION_REQUIRED,
                    "Review the catalogue preview and explicitly confirm before importing.");
        }
        return ResponseEntity.ok(productService.bulkCatalogUpload(
                brandId, file, previewSha256, selectedSkus,
                unavailableSkus == null ? java.util.Set.of() : new java.util.HashSet<>(unavailableSkus)));
    }

    @PostMapping("/bulk-catalog-preview")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<CatalogImportPreviewResponse> previewBulkCatalogUpload(
            @RequestParam("brandId") Long brandId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productService.previewCatalogUpload(brandId, file));
    }

    @PostMapping("/bulk-catalog-preview-async")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<CatalogJobProgressDTO> previewBulkCatalogUploadAsync(
            @RequestParam("brandId") Long brandId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.accepted().body(catalogJobService.submitPreviewJob(brandId, file));
    }

    @PostMapping("/bulk-catalog-upload-async")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<CatalogJobProgressDTO> bulkCatalogUploadAsync(
            @RequestParam("brandId") Long brandId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("previewSha256") String previewSha256,
            @RequestParam(value = "selectedSkus", required = false) List<String> selectedSkus,
            @RequestParam(value = "unavailableSkus", required = false) List<String> unavailableSkus,
            @RequestParam(defaultValue = "false") boolean confirmed) {
        if (!confirmed) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,
                    "Review the catalogue preview and explicitly confirm before importing.");
        }
        return ResponseEntity.accepted().body(catalogJobService.submitImportJob(
                brandId, file, previewSha256, selectedSkus,
                unavailableSkus == null ? Set.of() : new HashSet<>(unavailableSkus)));
    }

    @GetMapping("/catalog-jobs/{jobId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<CatalogJobProgressDTO> getCatalogJobProgress(@PathVariable String jobId) {
        return ResponseEntity.ok(catalogJobService.getJobProgress(jobId));
    }

    @GetMapping(value = "/catalog-jobs/{jobId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public SseEmitter getCatalogJobEvents(@PathVariable String jobId) {
        return catalogJobService.registerEmitter(jobId);
    }

    @PostMapping("/{id}/images")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ProductImageDTO> addProductImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "isPrimary", required = false) Boolean isPrimary,
            @RequestParam(value = "displayOrder", required = false) Integer displayOrder) {
        return new ResponseEntity<>(productService.addProductImage(id, file, isPrimary, displayOrder), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/images")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE')")
    public ResponseEntity<List<ProductImageDTO>> getProductImages(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductImages(id));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteProductImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        productService.deleteProductImage(id, imageId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAllProducts() {
        productService.deleteAllProducts();
        return ResponseEntity.noContent().build();
    }
}
