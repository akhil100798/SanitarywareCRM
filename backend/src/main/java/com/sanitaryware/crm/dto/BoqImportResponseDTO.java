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
public class BoqImportResponseDTO {
    private String fileName;
    private int totalRows;
    private int matchedCount;
    private int fuzzyCount;
    private int unmatchedCount;
    private BigDecimal estimatedSubtotal;

    @Builder.Default
    private List<BoqItemMatchDTO> items = new ArrayList<>();
}
