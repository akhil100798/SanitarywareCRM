package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.ProductFilterDTO;
import com.sanitaryware.crm.dto.ProductImageDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductImage;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.ProductMapper;
import com.sanitaryware.crm.repository.BrandRepository;
import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.ProductImageRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.specification.ProductSpecification;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductImageRepository productImageRepository;
    private final FileUploadService fileUploadService;
    private final AuditService auditService;

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
        return ProductMapper.toDTO(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsWithFilters(ProductFilterDTO filter, Pageable pageable) {
        validateFilter(filter);
        return productRepository.findAll(ProductSpecification.withFilters(filter), pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> searchProducts(String search, Pageable pageable) {
        if (search == null || search.isBlank()) {
            return getAllProducts(pageable);
        }
        ProductFilterDTO filter = ProductFilterDTO.builder().query(search).build();
        return productRepository.findAll(ProductSpecification.withFilters(filter), pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByCategory(Long categoryId, Pageable pageable) {
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        return productRepository.findByCategoryId(categoryId, pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByBrand(Long brandId, Pageable pageable) {
        brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));
        return productRepository.findByBrandId(brandId, pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDTO getProductByBarcode(String barcode) {
        if (!StringUtils.hasText(barcode)) {
            throw new IllegalArgumentException("Barcode cannot be blank");
        }
        Product product = productRepository.findByBarcode(barcode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with barcode: " + barcode));
        return ProductMapper.toDTO(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByHsnCode(String hsnCode, Pageable pageable) {
        if (!StringUtils.hasText(hsnCode)) {
            throw new IllegalArgumentException("HSN code cannot be blank");
        }
        return productRepository.findByHsnCode(hsnCode.trim(), pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getLowStockProducts() {
        return productRepository.findLowStockProducts().stream()
                .map(ProductMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getFeaturedProducts() {
        return productRepository.findByIsActiveTrueAndIsFeaturedTrue().stream()
                .map(ProductMapper::toDTO)
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

    @Override
    public BulkUploadResponse bulkCatalogUpload(Long brandId, MultipartFile file) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));

        List<String> errors = new ArrayList<>();
        int created = 0;
        int updated = 0;

        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            String[] lines = text.split("\\r?\\n");

            Pattern pattern = Pattern.compile("^\\d*\\s*(.*?)\\s+(\\d{7,10})\\s+(.*?)\\s+([\\d,]+\\.?\\d*)\\s+([\\d,]+\\.?\\d*)");

            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty() || line.toLowerCase().contains("mrp")) continue;

                Matcher matcher = pattern.matcher(line);
                if (matcher.find()) {
                    try {
                        String categoryName = matcher.group(1).trim();
                        String sku = matcher.group(2).trim();
                        String description = matcher.group(3).trim();
                        String newMrpStr = matcher.group(5).replace(",", "");
                        BigDecimal newMrp = new BigDecimal(newMrpStr);

                        Category category = categoryRepository.findByName(categoryName)
                                .orElseGet(() -> {
                                    Category newCat = new Category();
                                    newCat.setName(categoryName);
                                    newCat.setIsActive(true);
                                    return categoryRepository.save(newCat);
                                });

                        Product product = productRepository.findBySku(sku).orElse(null);
                        if (product == null) {
                            product = new Product();
                            product.setSku(sku);
                            product.setStockQuantity(0);
                            created++;
                        } else {
                            updated++;
                        }

                        product.setName(description);
                        product.setBrand(brand);
                        product.setCategory(category);
                        product.setMrp(newMrp);
                        product.setSellingPrice(newMrp);
                        product.setIsActive(true);
                        
                        productRepository.save(product);

                    } catch (Exception e) {
                        errors.add("Error parsing line: " + line + " - " + e.getMessage());
                    }
                }
            }
        } catch (IOException e) {
            errors.add("Failed to read PDF file: " + e.getMessage());
        }

        return BulkUploadResponse.builder()
                .createdCount(created)
                .updatedCount(updated)
                .totalProcessed(created + updated)
                .errors(errors)
                .build();
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

        try {
            String imgUrl = image.getImageUrl();
            if (imgUrl.contains("/api/files/download/")) {
                String relPath = imgUrl.substring(imgUrl.indexOf("/api/files/download/") + "/api/files/download/".length());
                fileUploadService.deleteFile(relPath);
            }
        } catch (Exception ignored) {
        }

        boolean wasPrimary = Boolean.TRUE.equals(image.getIsPrimary());
        productImageRepository.delete(image);

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
}
