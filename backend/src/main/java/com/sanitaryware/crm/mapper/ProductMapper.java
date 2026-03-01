package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductImage;

import java.util.stream.Collectors;

public class ProductMapper {

    public static ProductDTO toDTO(Product product) {
        if (product == null) return null;

        return ProductDTO.builder()
                .id(product.getId())
                .sku(product.getSku())
                .name(product.getName())
                .description(product.getDescription())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .brandId(product.getBrand() != null ? product.getBrand().getId() : null)
                .brandName(product.getBrand() != null ? product.getBrand().getName() : null)
                .mrp(product.getMrp())
                .sellingPrice(product.getSellingPrice())
                .purchasePrice(product.getPurchasePrice())
                .stockQuantity(product.getStockQuantity())
                .reorderLevel(product.getReorderLevel())
                .unit(product.getUnit())
                .color(product.getColor())
                .material(product.getMaterial())
                .size(product.getSize())
                .specifications(product.getSpecifications())
                .isActive(product.getIsActive())
                .isFeatured(product.getIsFeatured())
                .imageUrls(product.getImages() != null ? 
                        product.getImages().stream().map(ProductImage::getImageUrl).collect(Collectors.toList()) : null)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    public static Product toEntity(ProductDTO dto, Category category, Brand brand) {
        if (dto == null) return null;

        Product product = new Product();
        product.setId(dto.getId());
        product.setSku(dto.getSku());
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setCategory(category);
        product.setBrand(brand);
        product.setMrp(dto.getMrp());
        product.setSellingPrice(dto.getSellingPrice());
        product.setPurchasePrice(dto.getPurchasePrice());
        product.setStockQuantity(dto.getStockQuantity() != null ? dto.getStockQuantity() : 0);
        product.setReorderLevel(dto.getReorderLevel() != null ? dto.getReorderLevel() : 10);
        product.setUnit(dto.getUnit() != null ? dto.getUnit() : "Piece");
        product.setColor(dto.getColor());
        product.setMaterial(dto.getMaterial());
        product.setSize(dto.getSize());
        product.setSpecifications(dto.getSpecifications());
        product.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        product.setIsFeatured(dto.getIsFeatured() != null ? dto.getIsFeatured() : false);

        return product;
    }

    public static void updateEntity(Product product, ProductDTO dto, Category category, Brand brand) {
        if (dto == null || product == null) return;

        product.setSku(dto.getSku());
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setCategory(category);
        product.setBrand(brand);
        product.setMrp(dto.getMrp());
        product.setSellingPrice(dto.getSellingPrice());
        product.setPurchasePrice(dto.getPurchasePrice());
        product.setStockQuantity(dto.getStockQuantity());
        product.setReorderLevel(dto.getReorderLevel());
        product.setUnit(dto.getUnit());
        product.setColor(dto.getColor());
        product.setMaterial(dto.getMaterial());
        product.setSize(dto.getSize());
        product.setSpecifications(dto.getSpecifications());
        if (dto.getIsActive() != null) {
            product.setIsActive(dto.getIsActive());
        }
        if (dto.getIsFeatured() != null) {
            product.setIsFeatured(dto.getIsFeatured());
        }
    }
}
