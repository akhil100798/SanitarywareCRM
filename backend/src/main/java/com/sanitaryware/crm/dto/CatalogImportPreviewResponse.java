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
        List<String> warnings,
        int priceIncreasesCount,
        int priceDecreasesCount,
        int priceUnchangedCount
) {
    public CatalogImportPreviewResponse(
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
        this(brandId, brandName, fileName, fileSizeBytes, sha256, pageCount,
                candidateCount, createCount, updateCount, conflictCount, rejectedCount,
                importAllowed, items, warnings, 0, 0, 0);
    }
}

