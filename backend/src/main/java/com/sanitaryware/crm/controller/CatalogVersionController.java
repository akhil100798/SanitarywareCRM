package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.CatalogVersionDTO;
import com.sanitaryware.crm.service.CatalogVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogVersionController {

    private final CatalogVersionService catalogVersionService;

    @GetMapping("/brands/{brandId}/catalog-versions")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<CatalogVersionDTO>> getCatalogVersionsForBrand(@PathVariable Long brandId) {
        return ResponseEntity.ok(catalogVersionService.getVersionsForBrand(brandId));
    }

    @PostMapping("/catalog-versions/{id}/rollback")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<CatalogVersionDTO> rollbackCatalogVersion(@PathVariable Long id) {
        return ResponseEntity.ok(catalogVersionService.rollbackVersion(id));
    }

    @GetMapping("/catalog-versions/{id}/circular")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> downloadPriceRevisionCircular(@PathVariable Long id) {
        byte[] csv = catalogVersionService.generatePriceRevisionCsv(id);
        String fileName = "Price_Revision_Circular_v" + id + ".csv";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName).build().toString())
                .body(csv);
    }
}
