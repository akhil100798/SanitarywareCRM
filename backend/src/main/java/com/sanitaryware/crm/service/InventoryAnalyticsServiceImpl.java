package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.InventoryHealthSummaryDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.LowStockAlertDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.ReorderSuggestionDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryAnalyticsServiceImpl implements InventoryAnalyticsService {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;

    @Override
    @Transactional(readOnly = true)
    public List<LowStockAlertDTO> getLowStockAlerts() {
        List<Product> products = productRepository.findAll();
        List<LowStockAlertDTO> alerts = new ArrayList<>();

        for (Product product : products) {
            int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            int reorder = product.getReorderLevel() != null ? product.getReorderLevel() : 10;

            if (stock <= reorder) {
                String urgency;
                if (stock <= 0) {
                    urgency = "OUT_OF_STOCK";
                } else if (stock <= Math.max(1, reorder / 2)) {
                    urgency = "CRITICAL";
                } else {
                    urgency = "LOW";
                }

                alerts.add(LowStockAlertDTO.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .sku(product.getSku())
                        .brandName(product.getBrand() != null ? product.getBrand().getName() : "Unassigned")
                        .categoryName(product.getCategory() != null ? product.getCategory().getName() : "Unassigned")
                        .stockQuantity(stock)
                        .reorderLevel(reorder)
                        .deficit(Math.max(0, reorder - stock))
                        .urgency(urgency)
                        .build());
            }
        }

        alerts.sort((a, b) -> {
            int u1 = urgencyWeight(a.getUrgency());
            int u2 = urgencyWeight(b.getUrgency());
            if (u1 != u2) {
                return Integer.compare(u1, u2);
            }
            return Integer.compare(b.getDeficit(), a.getDeficit());
        });

        return alerts;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReorderSuggestionDTO> getReorderSuggestions() {
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        List<OrderRepository.ProductSalesVelocity> velocities = orderRepository
                .findSalesVelocitySince(thirtyDaysAgo, Order.OrderStatus.CANCELLED);

        Map<Long, Long> velocityMap = new HashMap<>();
        for (OrderRepository.ProductSalesVelocity v : velocities) {
            velocityMap.put(v.getProductId(), v.getTotalSold() != null ? v.getTotalSold() : 0L);
        }

        List<Product> products = productRepository.findAll();
        List<ReorderSuggestionDTO> suggestions = new ArrayList<>();

        for (Product product : products) {
            int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            int reorder = product.getReorderLevel() != null ? product.getReorderLevel() : 10;

            long totalSoldIn30Days = velocityMap.getOrDefault(product.getId(), 0L);
            double dailyVelocity = totalSoldIn30Days / 30.0;

            int daysRemaining;
            if (dailyVelocity > 0.001) {
                daysRemaining = (int) Math.floor(stock / dailyVelocity);
            } else {
                daysRemaining = stock > 0 ? 999 : 0;
            }

            boolean needsReorder = stock <= reorder || daysRemaining <= 14;

            if (needsReorder) {
                int targetBuffer = Math.max(reorder * 2, (int) Math.ceil(dailyVelocity * 30));
                int suggestedQty = Math.max(5, targetBuffer - stock);

                BigDecimal unitCost = product.getPurchasePrice() != null && product.getPurchasePrice().compareTo(BigDecimal.ZERO) > 0
                        ? product.getPurchasePrice()
                        : (product.getMrp() != null ? product.getMrp() : BigDecimal.ZERO);
                BigDecimal totalCost = unitCost.multiply(BigDecimal.valueOf(suggestedQty));

                Long supplierId = null;
                String supplierName = "Not Available";
                try {
                    List<PurchaseOrderRepository.DistributorSupplierInfo> suppliers = purchaseOrderRepository
                            .findRecentSuppliersForProduct(product.getId(), PageRequest.of(0, 1));
                    if (suppliers != null && !suppliers.isEmpty()) {
                        supplierId = suppliers.get(0).getDistributorId();
                        supplierName = suppliers.get(0).getDistributorName();
                    }
                } catch (Exception e) {
                    log.debug("Could not resolve supplier for product {}: {}", product.getId(), e.getMessage());
                }

                String reason;
                if (stock <= 0) {
                    reason = "Out of Stock - Immediate replenishment recommended";
                } else if (stock <= reorder) {
                    reason = "Below Safety Stock (" + stock + " / " + reorder + " units remaining)";
                } else {
                    reason = String.format("Predictive depletion in %d days (Sales velocity: %.2f units/day)", daysRemaining, dailyVelocity);
                }

                suggestions.add(ReorderSuggestionDTO.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .sku(product.getSku())
                        .brandName(product.getBrand() != null ? product.getBrand().getName() : "Unassigned")
                        .categoryName(product.getCategory() != null ? product.getCategory().getName() : "Unassigned")
                        .currentStock(stock)
                        .reorderLevel(reorder)
                        .dailySalesVelocity(Math.round(dailyVelocity * 100.0) / 100.0)
                        .daysOfStockRemaining(daysRemaining)
                        .suggestedReorderQuantity(suggestedQty)
                        .unitPurchasePrice(unitCost)
                        .estimatedTotalCost(totalCost)
                        .preferredDistributorId(supplierId)
                        .preferredDistributorName(supplierName)
                        .reorderReason(reason)
                        .build());
            }
        }

        suggestions.sort(Comparator.comparingInt(ReorderSuggestionDTO::getDaysOfStockRemaining)
                .thenComparing((a, b) -> Integer.compare(b.getSuggestedReorderQuantity(), a.getSuggestedReorderQuantity())));

        return suggestions;
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryHealthSummaryDTO getInventoryHealthSummary() {
        List<LowStockAlertDTO> alerts = getLowStockAlerts();
        List<ReorderSuggestionDTO> suggestions = getReorderSuggestions();

        long totalProducts = productRepository.count();
        long outOfStock = alerts.stream().filter(a -> "OUT_OF_STOCK".equals(a.getUrgency())).count();
        long lowStock = alerts.size() - outOfStock;
        long healthy = Math.max(0, totalProducts - alerts.size());

        BigDecimal totalReorderCost = suggestions.stream()
                .map(ReorderSuggestionDTO::getEstimatedTotalCost)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return InventoryHealthSummaryDTO.builder()
                .totalProducts(totalProducts)
                .healthyStockCount(healthy)
                .lowStockCount(lowStock)
                .outOfStockCount(outOfStock)
                .totalReorderEstimatedCost(totalReorderCost)
                .lowStockAlerts(alerts)
                .reorderSuggestions(suggestions)
                .build();
    }

    private int urgencyWeight(String urgency) {
        if ("OUT_OF_STOCK".equalsIgnoreCase(urgency)) return 1;
        if ("CRITICAL".equalsIgnoreCase(urgency)) return 2;
        return 3;
    }
}
