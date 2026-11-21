package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CatalogVersionDTO;

import java.util.List;

public interface CatalogVersionService {
    List<CatalogVersionDTO> getVersionsForBrand(Long brandId);
    CatalogVersionDTO rollbackVersion(Long versionId);
    byte[] generatePriceRevisionCsv(Long versionId);
    String getVersionFileName(Long versionId);
}
