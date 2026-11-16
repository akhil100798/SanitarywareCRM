package com.sanitaryware.crm.dto;

import java.math.BigDecimal;

public record CatalogImportPreviewItem(
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
}
