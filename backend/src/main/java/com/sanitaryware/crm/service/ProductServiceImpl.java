package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.CatalogueCleanupResult;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.ProductFilterDTO;
import com.sanitaryware.crm.dto.ProductImageDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.CatalogueImageCleanupTask;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductImage;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.ProductMapper;
import com.sanitaryware.crm.repository.BrandRepository;
import com.sanitaryware.crm.repository.CatalogueImageCleanupTaskRepository;
import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.ProductImageRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.specification.ProductSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductImageRepository productImageRepository;
    private final CatalogueImageCleanupTaskRepository catalogueImageCleanupTaskRepository;
    private final FileUploadService fileUploadService;
    private final AuditService auditService;
    private final CatalogPdfImportService catalogPdfImportService;
    private final AccessControlService accessControlService;
    private final PlatformTransactionManager transactionManager;

    @Override
    public ProductDTO createProduct(ProductDTO productDTO) {
        if (productDTO.getSku() != null && !productDTO.getSku().isBlank()) {
            productRepository.findBySku(productDTO.getSku().trim()).ifPresent(existing -> {
                throw new ConflictException("Product with SKU " + productDTO.getSku() + " already exists");
            });
        }

        if (productDTO.getBarcode() != null && !productDTO.getBarcode().isBlank()) {
            productRepository.findByBarcode(productDTO.getBarcode().trim()).ifPresent(existing -> {
                throw new ConflictException("Product with barcode " + productDTO.getBarcode() + " already exists");
            });
        }

        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + productDTO.getCategoryId()));
        Brand brand = brandRepository.findById(productDTO.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + productDTO.getBrandId()));

        Product product = ProductMapper.toEntity(productDTO, category, brand);
        Product savedProduct = productRepository.save(product);

        auditService.logEvent("CREATE", "PRODUCT", savedProduct.getId(),
                "Created product " + savedProduct.getName() + " (SKU: " + savedProduct.getSku() + ", Stock: " + savedProduct.getStockQuantity() + ")");

        return ProductMapper.toDTO(savedProduct);
    }

    @Override
    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        if (productDTO.getSku() != null && !productDTO.getSku().isBlank()) {
            productRepository.findBySku(productDTO.getSku().trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new ConflictException("Product with SKU " + productDTO.getSku() + " already exists");
                }
            });
        }

        if (productDTO.getBarcode() != null && !productDTO.getBarcode().isBlank()) {
            productRepository.findByBarcode(productDTO.getBarcode().trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new ConflictException("Product with barcode " + productDTO.getBarcode() + " already exists");
                }
            });
        }
        
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + productDTO.getCategoryId()));
        Brand brand = brandRepository.findById(productDTO.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + productDTO.getBrandId()));

        ProductMapper.updateEntity(product, productDTO, category, brand);
        Product updatedProduct = productRepository.save(product);

        auditService.logEvent("UPDATE", "PRODUCT", updatedProduct.getId(),
                "Updated product " + updatedProduct.getName() + " (SKU: " + updatedProduct.getSku() + ")");

        return ProductMapper.toDTO(updatedProduct);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        return toResponseDto(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable)
                .map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsWithFilters(ProductFilterDTO filter, Pageable pageable) {
        validateFilter(filter);
        return productRepository.findAll(ProductSpecification.withFilters(filter), pageable)
                .map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> searchProducts(String search, Pageable pageable) {
        if (search == null || search.isBlank()) {
            return getAllProducts(pageable);
        }
        ProductFilterDTO filter = ProductFilterDTO.builder().query(search).build();
        return productRepository.findAll(ProductSpecification.withFilters(filter), pageable)
                .map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByCategory(Long categoryId, Pageable pageable) {
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        return productRepository.findByCategoryId(categoryId, pageable)
                .map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByBrand(Long brandId, Pageable pageable) {
        brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));
        return productRepository.findByBrandId(brandId, pageable)
                .map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDTO getProductByBarcode(String barcode) {
        if (!StringUtils.hasText(barcode)) {
            throw new IllegalArgumentException("Barcode cannot be blank");
        }
        Product product = productRepository.findByBarcode(barcode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with barcode: " + barcode));
        return toResponseDto(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByHsnCode(String hsnCode, Pageable pageable) {
        if (!StringUtils.hasText(hsnCode)) {
            throw new IllegalArgumentException("HSN code cannot be blank");
        }
        return productRepository.findByHsnCode(hsnCode.trim(), pageable)
                .map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getLowStockProducts() {
        return productRepository.findLowStockProducts().stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getFeaturedProducts() {
        return productRepository.findByIsActiveTrueAndIsFeaturedTrue().stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        product.setIsActive(false);
        productRepository.save(product);

        auditService.logEvent("DEACTIVATE", "PRODUCT", id,
                "Deactivated product " + product.getName() + " (SKU: " + product.getSku() + ")");
    }

    @Override
    public void updateStock(Long id, Integer quantity) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        product.setStockQuantity(product.getStockQuantity() + quantity);
        productRepository.save(product);

        auditService.logEvent("ADJUST_STOCK", "PRODUCT", id,
                "Adjusted stock of product " + product.getName() + " by " + quantity + " (new stock: " + product.getStockQuantity() + ")");
    }

    public BulkUploadResponse bulkCatalogUpload(Long brandId, MultipartFile file) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));
        BulkUploadResponse response = catalogPdfImportService.importCatalog(brand, file);
        auditService.logEvent("BULK_IMPORT", "PRODUCT", brandId,
                "Imported " + response.getTotalProcessed() + " catalogue products and linked "
                        + response.getImagesLinkedCount() + " images for brand " + brand.getName());
        return response;
    }

    @Override
    public BulkUploadResponse bulkCatalogUpload(Long brandId, MultipartFile file, String batchId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));
        BulkUploadResponse response = catalogPdfImportService.importCatalog(brand, file, batchId);
        auditService.logEvent("BULK_IMPORT", "PRODUCT", brandId,
                "Imported " + response.getTotalProcessed() + " catalogue products and linked "
                        + response.getImagesLinkedCount() + " images for brand " + brand.getName());
        return response;
    }

    @Override
    public ProductImageDTO addProductImage(Long productId, MultipartFile file, Boolean isPrimary, Integer displayOrder) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        String storedFileName = fileUploadService.storeFile(file, "products");
        String fileDownloadUri = "/api/files/download/" + storedFileName;

        List<ProductImage> existingImages = productImageRepository.findByProductIdOrderByDisplayOrderAsc(productId);
        boolean effectivePrimary = (isPrimary != null && isPrimary) || existingImages.isEmpty();
        if (effectivePrimary) {
            for (ProductImage img : existingImages) {
                if (Boolean.TRUE.equals(img.getIsPrimary())) {
                    img.setIsPrimary(false);
                    productImageRepository.save(img);
                }
            }
        }

        int effectiveDisplayOrder = displayOrder != null ? displayOrder : existingImages.size();

        ProductImage newImage = new ProductImage();
        newImage.setProduct(product);
        newImage.setImageUrl(fileDownloadUri);
        newImage.setIsPrimary(effectivePrimary);
        newImage.setDisplayOrder(effectiveDisplayOrder);

        ProductImage savedImage = productImageRepository.save(newImage);

        return ProductImageDTO.builder()
                .id(savedImage.getId())
                .productId(productId)
                .imageUrl(savedImage.getImageUrl())
                .isPrimary(savedImage.getIsPrimary())
                .displayOrder(savedImage.getDisplayOrder())
                .uploadedAt(savedImage.getUploadedAt())
                .build();
    }

    @Override
    public void deleteProductImage(Long productId, Long imageId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        ProductImage image = productImageRepository.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + imageId + " for product: " + productId));

        boolean wasPrimary = Boolean.TRUE.equals(image.getIsPrimary());
        productImageRepository.delete(image);
        deleteImageBytesAfterCommit(image.getImageUrl());

        if (wasPrimary) {
            List<ProductImage> remaining = productImageRepository.findByProductIdOrderByDisplayOrderAsc(productId);
            if (!remaining.isEmpty()) {
                ProductImage newPrimary = remaining.get(0);
                newPrimary.setIsPrimary(true);
                productImageRepository.save(newPrimary);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductImageDTO> getProductImages(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        return productImageRepository.findByProductIdOrderByDisplayOrderAsc(productId).stream()
                .map(img -> ProductImageDTO.builder()
                        .id(img.getId())
                        .productId(productId)
                        .imageUrl(img.getImageUrl())
                        .isPrimary(img.getIsPrimary())
                        .displayOrder(img.getDisplayOrder())
                        .uploadedAt(img.getUploadedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private void validateFilter(ProductFilterDTO filter) {
        if (filter == null) return;

        if (filter.getMinPrice() != null && filter.getMinPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Minimum price cannot be negative");
        }
        if (filter.getMaxPrice() != null && filter.getMaxPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Maximum price cannot be negative");
        }
        if (filter.getMinPrice() != null && filter.getMaxPrice() != null
                && filter.getMinPrice().compareTo(filter.getMaxPrice()) > 0) {
            throw new IllegalArgumentException("Minimum price cannot exceed maximum price");
        }
        if (filter.getBarcode() != null && filter.getBarcode().length() > 100) {
            throw new IllegalArgumentException("Barcode cannot exceed 100 characters");
        }
        if (filter.getHsnCode() != null && filter.getHsnCode().length() > 20) {
            throw new IllegalArgumentException("HSN code cannot exceed 20 characters");
        }
    }

    private ProductDTO toResponseDto(Product product) {
        ProductDTO dto = ProductMapper.toDTO(product);
        User currentUser = accessControlService.currentUser();
        if (currentUser.getRole() != User.UserRole.ADMIN && currentUser.getRole() != User.UserRole.MANAGER) {
            dto.setPurchasePrice(null);
        }
        return dto;
    }

    @Override
    public void deleteAllProducts() {
        productImageRepository.deleteAll();
        productRepository.deleteAll();
        auditService.logEvent("DELETE_ALL", "PRODUCT", 0L, "Deleted all products from catalogue");
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CatalogueCleanupResult cleanupCatalogueImports(String batchId) {
        if (!StringUtils.hasText(batchId) || !batchId.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("A valid catalogue import batchId is required");
        }
        CleanupCounts counts = new TransactionTemplate(transactionManager).execute(status -> {
            List<Product> importedProducts = productRepository.findByCatalogueImportBatchId(batchId);
            List<ProductImage> importedImages = productImageRepository.findByCatalogueImportBatchId(batchId);
            productImageRepository.deleteAll(importedImages);
            Set<String> imageUrls = importedImages.stream().map(ProductImage::getImageUrl).collect(Collectors.toSet());
            for (String imageUrl : imageUrls) {
                if (!productImageRepository.existsImageReferenceInCurrentTransaction(imageUrl)
                        && !catalogueImageCleanupTaskRepository.existsByBatchIdAndImageUrl(batchId, imageUrl)) {
                    CatalogueImageCleanupTask task = new CatalogueImageCleanupTask();
                    task.setBatchId(batchId);
                    task.setImageUrl(imageUrl);
                    catalogueImageCleanupTaskRepository.save(task);
                }
            }
            for (Product product : importedProducts) {
                product.setIsActive(false);
                product.setCatalogueImportBatchId(null);
                productRepository.save(product);
            }
            auditService.logEvent("CLEANUP_CATALOGUE_IMPORTS", "PRODUCT", 0L,
                    "Batch " + batchId + ": deactivated " + importedProducts.size()
                            + " imported products and removed " + importedImages.size() + " catalogue image links");
            return new CleanupCounts(importedProducts.size(), importedImages.size());
        });

        processPendingCatalogueImageCleanup(batchId);
        return new CatalogueCleanupResult(batchId, counts.deactivatedProducts(), counts.removedImageLinks(),
                catalogueImageCleanupTaskRepository.findByBatchId(batchId).size());
    }

    private void processPendingCatalogueImageCleanup(String batchId) {
        String prefix = "/api/files/download/";
        for (CatalogueImageCleanupTask task : catalogueImageCleanupTaskRepository.findByBatchId(batchId)) {
            try {
                if (productImageRepository.existsByImageUrl(task.getImageUrl())) {
                    catalogueImageCleanupTaskRepository.deleteById(task.getId());
                    continue;
                }
                if (!task.getImageUrl().startsWith(prefix)) {
                    log.warn("Refusing to delete non-catalogue image path from cleanup task {}", task.getId());
                    continue;
                }
                fileUploadService.deleteFile(task.getImageUrl().substring(prefix.length()));
                catalogueImageCleanupTaskRepository.deleteById(task.getId());
            } catch (RuntimeException exception) {
                log.warn("Catalogue image cleanup remains pending for batch {} task {}", batchId, task.getId(), exception);
            }
        }
    }

    private record CleanupCounts(int deactivatedProducts, int removedImageLinks) { }

    private void deleteImageBytesAfterCommit(String imageUrl) {
        String prefix = "/api/files/download/";
        if (imageUrl == null || !imageUrl.startsWith(prefix)) return;
        Runnable removeIfUnreferenced = () -> {
            if (!productImageRepository.existsByImageUrl(imageUrl)) {
                // deleteIfExists is idempotent; storage failures must not be reported as cleanup success.
                fileUploadService.deleteFile(imageUrl.substring(prefix.length()));
            }
        };
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() { removeIfUnreferenced.run(); }
                    });
        } else {
            removeIfUnreferenced.run();
        }
    }
}
