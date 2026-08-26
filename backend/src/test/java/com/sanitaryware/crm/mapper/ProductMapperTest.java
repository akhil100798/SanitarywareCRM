package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ProductMapperTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void toDTO_MapsAllFieldsIncludingCatalogueExtensions() {
        Category category = new Category();
        category.setId(10L);
        category.setName("Ceramics");

        Brand brand = new Brand();
        brand.setId(20L);
        brand.setName("Jaquar");

        Product product = new Product();
        product.setId(1L);
        product.setSku("CAT-SKU-001");
        product.setBarcode("8901234567890");
        product.setName("Wall Hung Basin");
        product.setDescription("Premium ceramic basin");
        product.setCategory(category);
        product.setBrand(brand);
        product.setMrp(BigDecimal.valueOf(4500.00));
        product.setSellingPrice(BigDecimal.valueOf(3800.00));
        product.setPurchasePrice(BigDecimal.valueOf(2500.00));
        product.setStockQuantity(25);
        product.setReorderLevel(5);
        product.setUnit("Piece");
        product.setHsnCode("69101000");
        product.setGstRate(BigDecimal.valueOf(18.00));
        product.setColor("White");
        product.setMaterial("Ceramic");
        product.setSize("550x400mm");
        product.setSpecifications("Glossy finish");
        product.setIsActive(true);
        product.setIsFeatured(true);

        ProductDTO dto = ProductMapper.toDTO(product);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals("CAT-SKU-001", dto.getSku());
        assertEquals("8901234567890", dto.getBarcode());
        assertEquals("Wall Hung Basin", dto.getName());
        assertEquals(10L, dto.getCategoryId());
        assertEquals("Ceramics", dto.getCategoryName());
        assertEquals(20L, dto.getBrandId());
        assertEquals("Jaquar", dto.getBrandName());
        assertEquals(BigDecimal.valueOf(4500.00), dto.getMrp());
        assertEquals(BigDecimal.valueOf(3800.00), dto.getSellingPrice());
        assertEquals("69101000", dto.getHsnCode());
        assertEquals(BigDecimal.valueOf(18.00), dto.getGstRate());
    }

    @Test
    void toDTO_BackwardCompatibility_NullCatalogueFieldsRemainNull() {
        Product product = new Product();
        product.setId(2L);
        product.setSku("LEGACY-001");
        product.setName("Legacy Pipe");
        product.setMrp(BigDecimal.valueOf(200.00));
        product.setSellingPrice(BigDecimal.valueOf(180.00));
        product.setStockQuantity(10);
        product.setBarcode(null);
        product.setHsnCode(null);
        product.setGstRate(null);

        ProductDTO dto = ProductMapper.toDTO(product);

        assertNotNull(dto);
        assertEquals("LEGACY-001", dto.getSku());
        assertNull(dto.getBarcode());
        assertNull(dto.getHsnCode());
        assertNull(dto.getGstRate());
    }

    @Test
    void toEntity_MapsCatalogueFields() {
        Category category = new Category();
        category.setId(10L);

        Brand brand = new Brand();
        brand.setId(20L);

        ProductDTO dto = ProductDTO.builder()
                .sku("NEW-SKU-002")
                .barcode("8909876543210")
                .name("Single Lever Mixer")
                .categoryId(10L)
                .brandId(20L)
                .mrp(BigDecimal.valueOf(3200.00))
                .sellingPrice(BigDecimal.valueOf(2900.00))
                .stockQuantity(15)
                .hsnCode("84818020")
                .gstRate(BigDecimal.valueOf(18.00))
                .build();

        Product product = ProductMapper.toEntity(dto, category, brand);

        assertNotNull(product);
        assertEquals("NEW-SKU-002", product.getSku());
        assertEquals("8909876543210", product.getBarcode());
        assertEquals("Single Lever Mixer", product.getName());
        assertEquals("84818020", product.getHsnCode());
        assertEquals(BigDecimal.valueOf(18.00), product.getGstRate());
    }

    @Test
    void updateEntity_UpdatesCatalogueFields() {
        Category category = new Category();
        category.setId(10L);

        Brand brand = new Brand();
        brand.setId(20L);

        Product product = new Product();
        product.setSku("OLD-SKU");
        product.setBarcode("OLD-BARCODE");
        product.setHsnCode("OLD-HSN");
        product.setGstRate(BigDecimal.valueOf(12.00));

        ProductDTO updateDto = ProductDTO.builder()
                .sku("UPDATED-SKU")
                .barcode("UPDATED-BARCODE")
                .name("Updated Product")
                .categoryId(10L)
                .brandId(20L)
                .mrp(BigDecimal.valueOf(1000.00))
                .sellingPrice(BigDecimal.valueOf(900.00))
                .stockQuantity(20)
                .hsnCode("NEW-HSN-6910")
                .gstRate(BigDecimal.valueOf(18.00))
                .build();

        ProductMapper.updateEntity(product, updateDto, category, brand);

        assertEquals("UPDATED-SKU", product.getSku());
        assertEquals("UPDATED-BARCODE", product.getBarcode());
        assertEquals("NEW-HSN-6910", product.getHsnCode());
        assertEquals(BigDecimal.valueOf(18.00), product.getGstRate());
    }

    @Test
    void validation_ValidatesGstRateAndBarcodeLengths() {
        ProductDTO invalidGst = ProductDTO.builder()
                .sku("SKU-ERR")
                .name("Error Product")
                .categoryId(1L)
                .brandId(1L)
                .mrp(BigDecimal.valueOf(100))
                .sellingPrice(BigDecimal.valueOf(90))
                .stockQuantity(5)
                .gstRate(BigDecimal.valueOf(-5.00))
                .build();

        Set<ConstraintViolation<ProductDTO>> violations = validator.validate(invalidGst);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("gstRate")));

        ProductDTO excessiveGst = ProductDTO.builder()
                .sku("SKU-ERR-2")
                .name("Error Product")
                .categoryId(1L)
                .brandId(1L)
                .mrp(BigDecimal.valueOf(100))
                .sellingPrice(BigDecimal.valueOf(90))
                .stockQuantity(5)
                .gstRate(BigDecimal.valueOf(105.00))
                .build();

        violations = validator.validate(excessiveGst);
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("gstRate")));
    }
}
