package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.ProductMapper;
import com.sanitaryware.crm.repository.BrandRepository;
import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    @Override
    public ProductDTO createProduct(ProductDTO productDTO) {
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + productDTO.getCategoryId()));
        Brand brand = brandRepository.findById(productDTO.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + productDTO.getBrandId()));

        Product product = ProductMapper.toEntity(productDTO, category, brand);
        Product savedProduct = productRepository.save(product);
        return ProductMapper.toDTO(savedProduct);
    }

    @Override
    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + productDTO.getCategoryId()));
        Brand brand = brandRepository.findById(productDTO.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + productDTO.getBrandId()));

        ProductMapper.updateEntity(product, productDTO, category, brand);
        Product updatedProduct = productRepository.save(product);
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
    public Page<ProductDTO> searchProducts(String search, Pageable pageable) {
        return productRepository.searchProducts(search, pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByCategory(Long categoryId, Pageable pageable) {
        return productRepository.findByCategoryId(categoryId, pageable)
                .map(ProductMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByBrand(Long brandId, Pageable pageable) {
        return productRepository.findByBrandId(brandId, pageable)
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
    }

    @Override
    public void updateStock(Long id, Integer quantity) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        product.setStockQuantity(product.getStockQuantity() + quantity);
        productRepository.save(product);
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

            // Ashirvad Format Regex: SrNo (opt) | Group | Code (SKU) | Description | Existing MRP | New MRP
            // Pattern attempts to match: [Material Group] [SKU] [Description...] [OldPrice] [NewPrice]
            // SKU is usually 8 digits. Prices are numbers with possible decimals.
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

                        // Category handling
                        Category category = categoryRepository.findByName(categoryName)
                                .orElseGet(() -> {
                                    Category newCat = new Category();
                                    newCat.setName(categoryName);
                                    newCat.setIsActive(true);
                                    return categoryRepository.save(newCat);
                                });

                        // Product handling (Upsert)
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
}
