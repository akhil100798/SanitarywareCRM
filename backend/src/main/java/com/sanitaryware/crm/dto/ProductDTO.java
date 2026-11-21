package com.sanitaryware.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "SKU is required")
    private String sku;

    @Size(max = 100, message = "Barcode must not exceed 100 characters")
    private String barcode;

    @NotBlank(message = "Product name is required")
    private String name;
    private String description;
    @NotNull(message = "Category ID is required")
    private Long categoryId;
    private String categoryName;
    @NotNull(message = "Brand ID is required")
    private Long brandId;
    private String brandName;
    @NotNull(message = "MRP is required")
    @DecimalMin(value = "0.01", inclusive = true, message = "MRP must be positive")
    private BigDecimal mrp;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.01", inclusive = true, message = "Selling price must be positive")
    private BigDecimal sellingPrice;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @DecimalMin(value = "0.0", inclusive = true, message = "Purchase price cannot be negative")
    private BigDecimal purchasePrice;

    @NotNull(message = "Stock quantity is required")
    @Min(value = 0, message = "Stock quantity cannot be negative")
    private Integer stockQuantity;
    @Min(value = 0, message = "Reorder level cannot be negative")
    private Integer reorderLevel;
    private String unit;

    @jakarta.validation.constraints.Pattern(regexp = "^$|^[0-9]{4,8}$", message = "HSN code must be 4, 6, or 8 digits")
    @Size(max = 20, message = "HSN code must not exceed 20 characters")
    private String hsnCode;

    @DecimalMin(value = "0.0", inclusive = true, message = "GST rate cannot be negative")
    @DecimalMax(value = "100.0", inclusive = true, message = "GST rate cannot exceed 100%")
    private BigDecimal gstRate;
    private String color;
    private String material;
    private String materialCode;
    private String itemCode;
    private String binLocation;
    private String size;
    private String specifications;
    private Boolean isActive;
    private Boolean isAvailable;
    private Boolean isFeatured;
    private List<String> imageUrls;
    private List<ProductImageDTO> images;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public void setUnit(String unit) {
        if (unit == null || unit.isBlank()) {
            this.unit = "Piece";
        } else {
            String trimmed = unit.trim();
            this.unit = Character.toUpperCase(trimmed.charAt(0)) + (trimmed.length() > 1 ? trimmed.substring(1).toLowerCase() : "");
        }
    }

    public void setColor(String color) {
        if (color == null) {
            this.color = null;
        } else {
            this.color = color.replaceAll("[^a-zA-Z0-9\\s\\-_/#,.]", "").trim();
        }
    }
}
