package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDTO {
    private Long id;
    private String sku;
    private String name;
    private String description;
    private Long categoryId;
    private String categoryName;
    private Long brandId;
    private String brandName;
    private BigDecimal mrp;
    private BigDecimal sellingPrice;
    private Integer stockQuantity;
    private Integer reorderLevel;
    private String unit;
    private String color;
    private String material;
    private String size;
    private String specifications;
    private Boolean isActive;
    private Boolean isFeatured;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
