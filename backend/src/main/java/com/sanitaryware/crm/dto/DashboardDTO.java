package com.sanitaryware.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardDTO {
    private BigDecimal totalRevenue;
    private long totalOrders;
    private long pendingOrders;
    private Long totalCustomers;
    private long lowStockProducts;
    private BigDecimal distributorPaymentsTotal;
    private BigDecimal totalPayables;
    private BigDecimal totalReceivables;
    
    private List<OrderDTO> recentOrders;
    private List<ProductSalesDTO> topProducts;
    private Map<String, Long> orderStatusBreakdown;
    private Map<String, BigDecimal> monthlyRevenue;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductSalesDTO {
        private String productName;
        private Long quantitySold;
        private BigDecimal totalRevenue;
    }
}
