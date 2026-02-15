package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CategoryDTO;
import java.util.List;

public interface CategoryService {
    CategoryDTO createCategory(CategoryDTO categoryDTO);
    CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO);
    CategoryDTO getCategoryById(Long id);
    List<CategoryDTO> getAllCategories();
    List<CategoryDTO> getActiveCategories();
    List<CategoryDTO> getRootCategories();
    List<CategoryDTO> getSubCategories(Long parentId);
    void deleteCategory(Long id);
}
