package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoqItemCandidateDTO {
    private Long id;
    private String sku;
    private String name;
    private String brandName;
    private BigDecimal sellingPrice;
    private BigDecimal mrp;
    private Integer stockQuantity;
    private String primaryImageUrl;
}
