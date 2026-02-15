package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.BrandDTO;
import com.sanitaryware.crm.entity.Brand;

public class BrandMapper {

    public static BrandDTO toDTO(Brand brand) {
        if (brand == null) return null;

        return BrandDTO.builder()
                .id(brand.getId())
                .name(brand.getName())
                .description(brand.getDescription())
                .logoUrl(brand.getLogoUrl())
                .isActive(brand.getIsActive())
                .createdAt(brand.getCreatedAt())
                .updatedAt(brand.getUpdatedAt())
                .build();
    }

    public static Brand toEntity(BrandDTO dto) {
        if (dto == null) return null;

        Brand brand = new Brand();
        brand.setId(dto.getId());
        brand.setName(dto.getName());
        brand.setDescription(dto.getDescription());
        brand.setLogoUrl(dto.getLogoUrl());
        brand.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        return brand;
    }

    public static void updateEntity(Brand brand, BrandDTO dto) {
        if (dto == null || brand == null) return;

        brand.setName(dto.getName());
        brand.setDescription(dto.getDescription());
        brand.setLogoUrl(dto.getLogoUrl());
        if (dto.getIsActive() != null) {
            brand.setIsActive(dto.getIsActive());
        }
    }
}
