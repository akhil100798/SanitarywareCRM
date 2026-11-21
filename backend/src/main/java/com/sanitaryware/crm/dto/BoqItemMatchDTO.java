package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoqItemMatchDTO {
    private int rowIndex;
    private String rawText;
    private String requestedSku;
    private String requestedDescription;
    private Integer requestedQuantity;
    private BigDecimal targetPrice;

    private String matchStatus; // EXACT_MATCH, FUZZY_MATCH, UNMATCHED
    private Long matchedProductId;
    private String matchedProductName;
    private String matchedProductSku;
    private String brandName;
    private String barcode;
    private String hsnCode;
    private BigDecimal gstRate;
    private BigDecimal unitPrice;
    private BigDecimal mrp;
    private Integer stockQuantity;
    private String primaryImageUrl;

    @Builder.Default
    private List<BoqItemCandidateDTO> candidateOptions = new ArrayList<>();
}
