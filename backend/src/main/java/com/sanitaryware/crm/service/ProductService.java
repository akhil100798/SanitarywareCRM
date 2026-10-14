package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.CatalogueCleanupResult;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.ProductFilterDTO;
import com.sanitaryware.crm.dto.ProductImageDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductService {
    ProductDTO createProduct(ProductDTO productDTO);
    ProductDTO updateProduct(Long id, ProductDTO productDTO);
    ProductDTO getProductById(Long id);
    Page<ProductDTO> getAllProducts(Pageable pageable);
    Page<ProductDTO> getProductsWithFilters(ProductFilterDTO filter, Pageable pageable);
    Page<ProductDTO> searchProducts(String search, Pageable pageable);
    Page<ProductDTO> getProductsByCategory(Long categoryId, Pageable pageable);
    Page<ProductDTO> getProductsByBrand(Long brandId, Pageable pageable);
    ProductDTO getProductByBarcode(String barcode);
    Page<ProductDTO> getProductsByHsnCode(String hsnCode, Pageable pageable);
    List<ProductDTO> getLowStockProducts();
    List<ProductDTO> getFeaturedProducts();
    void deleteProduct(Long id);
    void updateStock(Long id, Integer quantity);
    BulkUploadResponse bulkCatalogUpload(Long brandId, MultipartFile file, String batchId);
    ProductImageDTO addProductImage(Long productId, MultipartFile file, Boolean isPrimary, Integer displayOrder);
    void deleteProductImage(Long productId, Long imageId);
    List<ProductImageDTO> getProductImages(Long productId);
    void deleteAllProducts();
    CatalogueCleanupResult cleanupCatalogueImports(String batchId);
}
