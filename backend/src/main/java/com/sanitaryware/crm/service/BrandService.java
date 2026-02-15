package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BrandDTO;
import java.util.List;

public interface BrandService {
    BrandDTO createBrand(BrandDTO brandDTO);
    BrandDTO updateBrand(Long id, BrandDTO brandDTO);
    BrandDTO getBrandById(Long id);
    List<BrandDTO> getAllBrands();
    List<BrandDTO> getActiveBrands();
    void deleteBrand(Long id);
}
