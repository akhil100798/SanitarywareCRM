package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.BrandDTO;
import com.sanitaryware.crm.service.BrandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<BrandDTO> createBrand(@Valid @RequestBody BrandDTO brandDTO) {
        return new ResponseEntity<>(brandService.createBrand(brandDTO), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<BrandDTO> updateBrand(@PathVariable Long id, @Valid @RequestBody BrandDTO brandDTO) {
        return ResponseEntity.ok(brandService.updateBrand(id, brandDTO));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BrandDTO> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(brandService.getBrandById(id));
    }

    @GetMapping
    public ResponseEntity<List<BrandDTO>> getAllBrands() {
        return ResponseEntity.ok(brandService.getAllBrands());
    }

    @GetMapping("/active")
    public ResponseEntity<List<BrandDTO>> getActiveBrands() {
        return ResponseEntity.ok(brandService.getActiveBrands());
    }

    @PostMapping("/{id}/catalog")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<BrandDTO> attachCatalog(@PathVariable Long id,
                                                   @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(brandService.attachCatalog(id, file));
    }

    @GetMapping("/{id}/catalog")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Resource> downloadCatalog(@PathVariable Long id) {
        BrandService.BrandCatalogFile catalog = brandService.getCatalog(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(catalog.fileName()).build().toString())
                .body(catalog.content());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
        return ResponseEntity.noContent().build();
    }
}
