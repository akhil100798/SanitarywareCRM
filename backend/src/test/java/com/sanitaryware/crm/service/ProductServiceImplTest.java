package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.ProductFilterDTO;
import com.sanitaryware.crm.dto.ProductImageDTO;
import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductImage;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.BrandRepository;
import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.ProductImageRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @Mock
    private FileUploadService fileUploadService;

    @Mock
    private AuditService auditService;

    @Mock
    private CatalogPdfImportService catalogPdfImportService;

    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private ProductServiceImpl productService;

    private Category testCategory;
    private Brand testBrand;
    private Product testProduct;

    @BeforeEach
    void setUp() {
        testCategory = new Category();
        testCategory.setId(1L);
        testCategory.setName("Sanitaryware");

        testBrand = new Brand();
        testBrand.setId(1L);
        testBrand.setName("Jaquar");

        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setSku("JAQ-BASIN-001");
        testProduct.setBarcode("8901234567890");
        testProduct.setName("Jaquar Basin");
        testProduct.setCategory(testCategory);
        testProduct.setBrand(testBrand);
        testProduct.setMrp(BigDecimal.valueOf(2500.00));
        testProduct.setSellingPrice(BigDecimal.valueOf(2200.00));
        testProduct.setPurchasePrice(BigDecimal.valueOf(1400.00));
        testProduct.setStockQuantity(10);
        testProduct.setReorderLevel(2);
        testProduct.setIsActive(true);

        User managerUser = new User();
        managerUser.setRole(User.UserRole.MANAGER);
        lenient().when(accessControlService.currentUser()).thenReturn(managerUser);
    }

    @Test
    void createProduct_WithDuplicateSku_ThrowsConflict() {
        ProductDTO dto = ProductDTO.builder()
                .sku("JAQ-BASIN-001")
                .categoryId(1L)
                .brandId(1L)
                .build();

        when(productRepository.findBySku("JAQ-BASIN-001")).thenReturn(Optional.of(testProduct));

        assertThrows(ConflictException.class, () -> productService.createProduct(dto));
        verify(productRepository, never()).save(any());
    }

    @Test
    void bulkCatalogUpload_DelegatesCatalogueParsingAndAuditsSummary() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "ashirvad-catalogue.pdf", "application/pdf", "%PDF".getBytes());
        BulkUploadResponse expected = BulkUploadResponse.builder()
                .createdCount(6)
                .updatedCount(1)
                .totalProcessed(7)
                .imagesLinkedCount(6)
                .skippedCount(0)
                .errors(Collections.emptyList())
                .build();

        when(brandRepository.findById(1L)).thenReturn(Optional.of(testBrand));
        when(catalogPdfImportService.importCatalog(testBrand, file)).thenReturn(expected);

        BulkUploadResponse result = productService.bulkCatalogUpload(1L, file);

        assertSame(expected, result);
        verify(catalogPdfImportService).importCatalog(testBrand, file);
        verify(auditService).logEvent(eq("BULK_IMPORT"), eq("PRODUCT"), eq(1L), contains("7 catalogue products"));
    }

    @Test
    void createProduct_WithDuplicateBarcode_ThrowsConflict() {
        ProductDTO dto = ProductDTO.builder()
                .sku("NEW-SKU")
                .barcode("8901234567890")
                .categoryId(1L)
                .brandId(1L)
                .build();

        when(productRepository.findBySku("NEW-SKU")).thenReturn(Optional.empty());
        when(productRepository.findByBarcode("8901234567890")).thenReturn(Optional.of(testProduct));

        assertThrows(ConflictException.class, () -> productService.createProduct(dto));
        verify(productRepository, never()).save(any());
    }

    @Test
    void getProductsWithFilters_ValidFilters_ReturnsPage() {
        ProductFilterDTO filter = ProductFilterDTO.builder()
                .minPrice(BigDecimal.valueOf(100))
                .maxPrice(BigDecimal.valueOf(5000))
                .inStock(true)
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> page = new PageImpl<>(List.of(testProduct));
        when(productRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);

        Page<ProductDTO> result = productService.getProductsWithFilters(filter, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("JAQ-BASIN-001", result.getContent().get(0).getSku());
    }

    @Test
    void getProductById_SalesDoesNotReceivePurchasePrice() {
        User salesUser = new User();
        salesUser.setRole(User.UserRole.SALES);
        when(accessControlService.currentUser()).thenReturn(salesUser);
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));

        ProductDTO result = productService.getProductById(1L);

        assertNull(result.getPurchasePrice());
    }

    @Test
    void getProductById_AdminReceivesPurchasePrice() {
        User adminUser = new User();
        adminUser.setRole(User.UserRole.ADMIN);
        when(accessControlService.currentUser()).thenReturn(adminUser);
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));

        ProductDTO result = productService.getProductById(1L);

        assertEquals(0, new BigDecimal("1400.00").compareTo(result.getPurchasePrice()));
    }

    @Test
    void getProductsWithFilters_MinPriceExceedsMaxPrice_ThrowsIllegalArgument() {
        ProductFilterDTO filter = ProductFilterDTO.builder()
                .minPrice(BigDecimal.valueOf(5000))
                .maxPrice(BigDecimal.valueOf(100))
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                productService.getProductsWithFilters(filter, PageRequest.of(0, 10)));
    }

    @Test
    void getProductByBarcode_Found_ReturnsProduct() {
        when(productRepository.findByBarcode("8901234567890")).thenReturn(Optional.of(testProduct));

        ProductDTO dto = productService.getProductByBarcode("8901234567890");

        assertNotNull(dto);
        assertEquals("8901234567890", dto.getBarcode());
    }

    @Test
    void getProductByBarcode_NotFound_Throws404() {
        when(productRepository.findByBarcode("UNKNOWN")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                productService.getProductByBarcode("UNKNOWN"));
    }

    @Test
    void addProductImage_FirstImage_AutoAssignedAsPrimary() {
        MockMultipartFile file = new MockMultipartFile("file", "image1.jpg", "image/jpeg", "data".getBytes());
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(fileUploadService.storeFile(file, "products")).thenReturn("products/uuid1.jpg");
        when(productImageRepository.findByProductIdOrderByDisplayOrderAsc(1L)).thenReturn(Collections.emptyList());

        ProductImage savedImage = new ProductImage(10L, testProduct, "/api/files/download/products/uuid1.jpg", true, 0, null);
        when(productImageRepository.save(any(ProductImage.class))).thenReturn(savedImage);

        ProductImageDTO result = productService.addProductImage(1L, file, false, null);

        assertNotNull(result);
        assertTrue(result.getIsPrimary());
        assertEquals(0, result.getDisplayOrder());
    }

    @Test
    void addProductImage_SetAsPrimary_UpdatesExistingPrimaryImages() {
        MockMultipartFile file = new MockMultipartFile("file", "image2.jpg", "image/jpeg", "data".getBytes());
        ProductImage existingImg = new ProductImage(10L, testProduct, "/api/files/download/products/uuid1.jpg", true, 0, null);

        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(fileUploadService.storeFile(file, "products")).thenReturn("products/uuid2.jpg");
        when(productImageRepository.findByProductIdOrderByDisplayOrderAsc(1L)).thenReturn(new ArrayList<>(List.of(existingImg)));

        ProductImage savedImage = new ProductImage(11L, testProduct, "/api/files/download/products/uuid2.jpg", true, 1, null);
        when(productImageRepository.save(any(ProductImage.class))).thenReturn(savedImage);

        ProductImageDTO result = productService.addProductImage(1L, file, true, 1);

        assertNotNull(result);
        assertTrue(result.getIsPrimary());
        assertFalse(existingImg.getIsPrimary());
        verify(productImageRepository, atLeast(2)).save(any(ProductImage.class));
    }

    @Test
    void deleteProductImage_PrimaryDeleted_ReassignsPrimaryToRemaining() {
        ProductImage primaryImg = new ProductImage(10L, testProduct, "/api/files/download/products/uuid1.jpg", true, 0, null);
        ProductImage secondaryImg = new ProductImage(11L, testProduct, "/api/files/download/products/uuid2.jpg", false, 1, null);

        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productImageRepository.findByIdAndProductId(10L, 1L)).thenReturn(Optional.of(primaryImg));
        when(productImageRepository.findByProductIdOrderByDisplayOrderAsc(1L)).thenReturn(List.of(secondaryImg));

        productService.deleteProductImage(1L, 10L);

        verify(productImageRepository).delete(primaryImg);
        assertTrue(secondaryImg.getIsPrimary());
        verify(productImageRepository).save(secondaryImg);
    }

    @Test
    void deleteProductImage_ImageNotFoundOrWrongProduct_Throws404() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productImageRepository.findByIdAndProductId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                productService.deleteProductImage(1L, 99L));
        verify(productImageRepository, never()).delete(any());
    }

    @Test
    void deleteProductImage_ProductNotFound_Throws404() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                productService.deleteProductImage(99L, 10L));
        verify(productImageRepository, never()).delete(any());
    }

    @Test
    void getProductsByCategory_CategoryNotFound_Throws404() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                productService.getProductsByCategory(99L, PageRequest.of(0, 10)));
    }

    @Test
    void getProductsByBrand_BrandNotFound_Throws404() {
        when(brandRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                productService.getProductsByBrand(99L, PageRequest.of(0, 10)));
    }

    @Test
    void getProductsWithFilters_NegativeMinPrice_ThrowsIllegalArgument() {
        ProductFilterDTO filter = ProductFilterDTO.builder()
                .minPrice(BigDecimal.valueOf(-10))
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                productService.getProductsWithFilters(filter, PageRequest.of(0, 10)));
    }

    @Test
    void getProductsWithFilters_BarcodeTooLong_ThrowsIllegalArgument() {
        ProductFilterDTO filter = ProductFilterDTO.builder()
                .barcode("A".repeat(101))
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                productService.getProductsWithFilters(filter, PageRequest.of(0, 10)));
    }

    @Test
    void getProductsWithFilters_HsnTooLong_ThrowsIllegalArgument() {
        ProductFilterDTO filter = ProductFilterDTO.builder()
                .hsnCode("1".repeat(21))
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                productService.getProductsWithFilters(filter, PageRequest.of(0, 10)));
    }
}
