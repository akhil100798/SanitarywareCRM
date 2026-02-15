package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.CategoryDTO;
import com.sanitaryware.crm.entity.Category;

public class CategoryMapper {

    public static CategoryDTO toDTO(Category category) {
        if (category == null) return null;

        return CategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .isActive(category.getIsActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    public static Category toEntity(CategoryDTO dto, Category parent) {
        if (dto == null) return null;

        Category category = new Category();
        category.setId(dto.getId());
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setParent(parent);
        category.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        return category;
    }

    public static void updateEntity(Category category, CategoryDTO dto, Category parent) {
        if (dto == null || category == null) return;

        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setParent(parent);
        if (dto.getIsActive() != null) {
            category.setIsActive(dto.getIsActive());
        }
    }
}
