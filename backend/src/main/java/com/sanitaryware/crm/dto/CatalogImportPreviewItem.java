package com.sanitaryware.crm.dto;

import java.math.BigDecimal;

public record CatalogImportPreviewItem(
        String sku,
        String name,
        BigDecimal proposedMrp,
        BigDecimal sellingPrice,
        String size,
        String category,
        String description,
        String action,
        int sourcePage,
        String existingName,
        BigDecimal existingMrp,
        String existingBrand,
        String hsnCode,
        String material,
        String materialCode,
        String itemCode,
        Boolean isAvailable,
        Boolean hasImage,
        String imagePreviewUrl,
        BigDecimal priceDifference,
        Double priceDiffPercentage,
        String priceChangeType
) {
    public CatalogImportPreviewItem(
            String sku,
            String name,
            BigDecimal proposedMrp,
            BigDecimal sellingPrice,
            String size,
            String category,
            String description,
            String action,
            int sourcePage,
            String existingName,
            BigDecimal existingMrp,
            String existingBrand,
            String hsnCode,
            String material,
            String materialCode,
            String itemCode,
            Boolean isAvailable,
            Boolean hasImage,
            String imagePreviewUrl
    ) {
        this(sku, name, proposedMrp, sellingPrice, size, category, description, action, sourcePage,
                existingName, existingMrp, existingBrand, hsnCode, material, materialCode, itemCode,
                isAvailable, hasImage, imagePreviewUrl, null, null,
                existingName == null ? "NEW" : (existingMrp != null && proposedMrp != null && proposedMrp.compareTo(existingMrp) > 0 ? "INCREASE" : (existingMrp != null && proposedMrp != null && proposedMrp.compareTo(existingMrp) < 0 ? "DECREASE" : "UNCHANGED")));
    }

    public CatalogImportPreviewItem(
            String sku,
            String name,
            BigDecimal proposedMrp,
            String action,
            int sourcePage,
            String existingName,
            BigDecimal existingMrp,
            String existingBrand,
            String hsnCode,
            String material,
            String materialCode,
            String itemCode,
            Boolean isAvailable,
            Boolean hasImage,
            String imagePreviewUrl
    ) {
        this(sku, name, proposedMrp, proposedMrp, null, null, null, action, sourcePage, existingName,
                existingMrp, existingBrand, hsnCode, material, materialCode, itemCode, isAvailable, hasImage, imagePreviewUrl,
                null, null, existingName == null ? "NEW" : "UNCHANGED");
    }

    public CatalogImportPreviewItem(
            String sku,
            String name,
            BigDecimal proposedMrp,
            String action,
            int sourcePage,
            String existingName,
            BigDecimal existingMrp,
            String existingBrand,
            String hsnCode,
            String material,
            String materialCode,
            String itemCode,
            Boolean isAvailable
    ) {
        this(sku, name, proposedMrp, proposedMrp, null, null, null, action, sourcePage, existingName,
                existingMrp, existingBrand, hsnCode, material, materialCode, itemCode, isAvailable, false, null,
                null, null, existingName == null ? "NEW" : "UNCHANGED");
    }
}
