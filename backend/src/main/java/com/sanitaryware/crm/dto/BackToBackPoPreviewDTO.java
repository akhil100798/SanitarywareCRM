package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackToBackPoPreviewDTO {
    private Long quotationId;
    private String quotationNumber;
    private Long customerId;
    private String customerName;
    private String quotationStatus;
    private Integer totalLineItems;
    private Integer totalDeficitItems;
    private BigDecimal estimatedTotalProcurementCost;
    private List<SupplierPoGroupDTO> supplierGroups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SupplierPoGroupDTO {
        private Long brandId;
        private String brandName;
        private Long suggestedDistributorId;
        private String suggestedDistributorName;
        private List<BackToBackItemDTO> items;
        private BigDecimal estimatedGroupSubtotal;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BackToBackItemDTO {
        private Long quotationItemId;
        private Long productId;
        private String productSku;
        private String productName;
        private String brandName;
        private Integer requestedQuantity;
        private Integer currentStock;
        private Integer deficitQuantity;
        private Integer recommendedOrderQuantity;
        private BigDecimal unitCost;
        private BigDecimal sellingPrice;
        private BigDecimal gstRate;
        private String hsnCode;
        private String barcode;
        private String primaryImageUrl;
    }
}
