package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CatalogVersionDTO {
    private Long id;
    private Long brandId;
    private String brandName;
    private String versionTag;
    private String fileName;
    private String sha256;
    private Integer totalProducts;
    private Integer createdCount;
    private Integer updatedCount;
    private String status;
    private LocalDateTime createdAt;
    private String createdBy;
}
