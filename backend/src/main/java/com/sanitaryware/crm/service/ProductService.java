package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.ProductDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductService {
    ProductDTO createProduct(ProductDTO productDTO);
    ProductDTO updateProduct(Long id, ProductDTO productDTO);
    ProductDTO getProductById(Long id);
    Page<ProductDTO> getAllProducts(Pageable pageable);
    Page<ProductDTO> searchProducts(String search, Pageable pageable);
    Page<ProductDTO> getProductsByCategory(Long categoryId, Pageable pageable);
    Page<ProductDTO> getProductsByBrand(Long brandId, Pageable pageable);
    List<ProductDTO> getLowStockProducts();
    List<ProductDTO> getFeaturedProducts();
    void deleteProduct(Long id);
    void updateStock(Long id, Integer quantity);
    com.sanitaryware.crm.dto.BulkUploadResponse bulkCatalogUpload(Long brandId, org.springframework.web.multipart.MultipartFile file);
}
