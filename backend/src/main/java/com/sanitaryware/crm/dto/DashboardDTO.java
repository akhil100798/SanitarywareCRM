package com.sanitaryware.crm.dto;

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
public class DashboardDTO {
    private BigDecimal totalRevenue;
    private long totalOrders;
    private long pendingOrders;
    private long totalCustomers;
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
