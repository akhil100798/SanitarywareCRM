package com.sanitaryware.crm.dto;

public record CatalogJobProgressDTO(
        String jobId,
        String jobType,
        String brandName,
        String fileName,
        String status,
        int currentPage,
        int totalPages,
        int progressPercent,
        String stageMessage,
        int productsFound,
        int imagesCropped,
        CatalogImportPreviewResponse previewResult,
        BulkUploadResponse importResult,
        String errorMessage
) {
    public static CatalogJobProgressDTO pending(String jobId, String jobType, String brandName, String fileName) {
        return new CatalogJobProgressDTO(
                jobId, jobType, brandName, fileName,
                "PENDING", 0, 0, 0,
                "Initializing catalog parsing job...", 0, 0,
                null, null, null
        );
    }
}
