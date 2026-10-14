package com.sanitaryware.crm.dto;

public record CatalogueCleanupResult(
        String batchId,
        int deactivatedProducts,
        int removedImageLinks,
        int pendingImageCleanup) {
}
