package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.nio.file.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"}, showSql = false)
@Import({ProductServiceImpl.class, FileUploadServiceImpl.class, CatalogPdfImportService.class,
        AccessControlService.class, AuditServiceImpl.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class SharedProductImageIntegrationTest {
    @TempDir static Path uploads;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("file.upload-dir", () -> uploads.toString());
    }
    @Autowired ProductService service;
    @Autowired ProductRepository products;
    @Autowired ProductImageRepository images;
    @Autowired BrandRepository brands;
    @Autowired CategoryRepository categories;
    @Autowired PlatformTransactionManager transactions;
    Long retainedId, importedId, otherBatchId, retainedImageId, importedImageId, updatedProductCatalogueImageId, otherBatchImageId;
    Path sharedFile, catalogueFile, otherBatchFile;

    @BeforeEach void fixtures() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Files.createDirectories(uploads.resolve("products"));
        sharedFile = uploads.resolve("products/shared-" + suffix + ".png");
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(1, 1, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", sharedFile.toFile());
        catalogueFile = uploads.resolve("products/catalogue-a-" + suffix + ".png");
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(1, 1, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", catalogueFile.toFile());
        otherBatchFile = uploads.resolve("products/catalogue-b-" + suffix + ".png");
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(1, 1, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", otherBatchFile.toFile());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            Brand brand = new Brand(); brand.setName(suffix); brands.save(brand);
            Category category = new Category(); category.setName(suffix); categories.save(category);
            Product retained = product("old-" + suffix, brand, category); retainedId = products.save(retained).getId();
            Product imported = product("new-" + suffix, brand, category); imported.setCatalogueImportBatchId("batch-a"); importedId = products.save(imported).getId();
            Product other = product("other-" + suffix, brand, category); other.setCatalogueImportBatchId("batch-b"); otherBatchId = products.save(other).getId();
            retainedImageId = image(retained).getId(); importedImageId = image(imported).getId();
            ProductImage updatedProductCatalogueImage = catalogueImage(retained, "batch-a", catalogueFile);
            updatedProductCatalogueImageId = updatedProductCatalogueImage.getId();
            otherBatchImageId = catalogueImage(other, "batch-b", otherBatchFile).getId();
            catalogueImage(imported, "batch-a", catalogueFile);
        });
    }
    private Product product(String sku, Brand brand, Category category) {
        Product product = new Product(); product.setSku(sku); product.setName(sku); product.setBrand(brand);
        product.setCategory(category); product.setMrp(BigDecimal.TEN); product.setSellingPrice(BigDecimal.TEN);
        product.setStockQuantity(7); return product;
    }
    private ProductImage image(Product product) {
        ProductImage image = new ProductImage(); image.setProduct(product); image.setIsPrimary(true);
        image.setImageUrl("/api/files/download/products/" + sharedFile.getFileName()); return images.save(image);
    }
    private ProductImage catalogueImage(Product product, String batchId, Path path) {
        ProductImage image = new ProductImage(); image.setProduct(product); image.setIsPrimary(true);
        image.setCatalogueImportBatchId(batchId);
        image.setImageUrl("/api/files/download/products/" + path.getFileName()); return images.save(image);
    }
    @Test void deletingOneSiblingPreservesBytesUntilLastReferenceIsRemoved() {
        service.deleteProductImage(importedId, importedImageId);
        assertThat(Files.exists(sharedFile)).isTrue(); assertThat(images.existsById(retainedImageId)).isTrue();
        service.deleteProductImage(retainedId, retainedImageId); assertThat(Files.exists(sharedFile)).isFalse();
    }
    @Test void catalogueCleanupIsBatchScopedAndPreservesUpdatedProductsAndUnrelatedImages() {
        assertThat(service.cleanupCatalogueImports("batch-a").deactivatedProducts()).isEqualTo(1);
        assertThat(products.findById(importedId).orElseThrow().getIsActive()).isFalse();
        Product retained = products.findById(retainedId).orElseThrow();
        assertThat(retained.getIsActive()).isTrue(); assertThat(retained.getStockQuantity()).isEqualTo(7);
        assertThat(retained.getSellingPrice()).isEqualByComparingTo("10");
        assertThat(images.existsById(retainedImageId)).isTrue(); assertThat(Files.exists(sharedFile)).isTrue();
        assertThat(images.existsById(importedImageId)).isTrue();
        assertThat(images.existsById(updatedProductCatalogueImageId)).isFalse();
        assertThat(images.existsById(otherBatchImageId)).isTrue();
        assertThat(Files.exists(catalogueFile)).isFalse();
        assertThat(Files.exists(otherBatchFile)).isTrue();
        assertThat(products.findById(otherBatchId).orElseThrow().getIsActive()).isTrue();
        assertThat(service.cleanupCatalogueImports("batch-a").deactivatedProducts()).isZero();
        assertThat(service.cleanupCatalogueImports("batch-b").deactivatedProducts()).isEqualTo(1);
    }

    @Test void cleanupRejectsInvalidBatchIdsWithoutChangingProducts() {
        assertThatThrownBy(() -> service.cleanupCatalogueImports("../all"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(products.findById(importedId).orElseThrow().getIsActive()).isTrue();
        assertThat(images.existsById(importedImageId)).isTrue();
    }
    @Test void rollbackDoesNotDeleteBytesForRestoredReferences() {
        assertThatThrownBy(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            service.deleteProductImage(importedId, importedImageId); service.deleteProductImage(retainedId, retainedImageId);
            throw new IllegalStateException("Intentional rollback");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(images.existsById(retainedImageId)).isTrue(); assertThat(images.existsById(importedImageId)).isTrue();
        assertThat(Files.exists(sharedFile)).isTrue();
    }
}
