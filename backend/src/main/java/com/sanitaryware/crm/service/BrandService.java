package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BrandDTO;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface BrandService {
    BrandDTO createBrand(BrandDTO brandDTO);
    BrandDTO updateBrand(Long id, BrandDTO brandDTO);
    BrandDTO getBrandById(Long id);
    List<BrandDTO> getAllBrands();
    List<BrandDTO> getActiveBrands();
    BrandDTO attachCatalog(Long id, MultipartFile file);
    BrandCatalogFile getCatalog(Long id);
    void deleteBrand(Long id);

    record BrandCatalogFile(Resource content, String fileName) { }
}
