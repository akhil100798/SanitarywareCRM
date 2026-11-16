package com.sanitaryware.crm.dto;

import java.util.List;

public record CatalogImportPreviewResponse(
        Long brandId,
        String brandName,
        String fileName,
        long fileSizeBytes,
        String sha256,
        int pageCount,
        int candidateCount,
        int createCount,
        int updateCount,
        int conflictCount,
        int rejectedCount,
        boolean importAllowed,
        List<CatalogImportPreviewItem> items,
        List<String> warnings
) {
}
