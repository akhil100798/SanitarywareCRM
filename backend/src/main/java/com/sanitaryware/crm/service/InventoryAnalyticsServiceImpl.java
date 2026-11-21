package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.DeadStockItemDTO;
import com.sanitaryware.crm.dto.InventoryAnalyticsDTO.DeadStockSummaryDTO;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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
        Map<Long, LowStockAlertDTO> alertMap = new LinkedHashMap<>();

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

                alertMap.put(product.getId(), LowStockAlertDTO.builder()
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

        List<LowStockAlertDTO> alerts = new ArrayList<>(alertMap.values());

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
        Map<Long, ReorderSuggestionDTO> suggestionsMap = new LinkedHashMap<>();

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

            // Manufacturer Lead Time logic
            int leadTimeDays = resolveLeadTimeDays(product);
            int safetyBufferDays = 7;
            int reorderPoint = (int) Math.ceil(dailyVelocity * (leadTimeDays + safetyBufferDays)) + reorder;
            int daysUntilReorderDeadline = daysRemaining - leadTimeDays;

            String leadTimeUrgency;
            if (stock <= 0 || daysUntilReorderDeadline <= 0) {
                leadTimeUrgency = "STOCKOUT_IMMINENT";
            } else if (daysUntilReorderDeadline <= 7) {
                leadTimeUrgency = "ORDER_THIS_WEEK";
            } else {
                leadTimeUrgency = "HEALTHY";
            }

            boolean needsReorder = stock <= reorder || stock <= reorderPoint || daysRemaining <= (leadTimeDays + safetyBufferDays);

            if (needsReorder) {
                int targetBuffer = Math.max(reorder * 2, (int) Math.ceil(dailyVelocity * (leadTimeDays + 30)));
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
                } else if (daysUntilReorderDeadline <= 0) {
                    reason = String.format("Stockout risk! Replenishment lead time is %d days, but only %d days of stock remain.", leadTimeDays, daysRemaining);
                } else if (stock <= reorder) {
                    reason = "Below Safety Stock (" + stock + " / " + reorder + " units remaining)";
                } else {
                    reason = String.format("Order within %d days to cover %d-day manufacturer replenishment lead time.", daysUntilReorderDeadline, leadTimeDays);
                }

                suggestionsMap.put(product.getId(), ReorderSuggestionDTO.builder()
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
                        .leadTimeDays(leadTimeDays)
                        .safetyBufferDays(safetyBufferDays)
                        .reorderPoint(reorderPoint)
                        .daysUntilReorderDeadline(daysUntilReorderDeadline)
                        .leadTimeUrgency(leadTimeUrgency)
                        .build());
            }
        }

        List<ReorderSuggestionDTO> suggestions = new ArrayList<>(suggestionsMap.values());
        suggestions.sort(Comparator.comparingInt(ReorderSuggestionDTO::getDaysOfStockRemaining)
                .thenComparing((a, b) -> Integer.compare(b.getSuggestedReorderQuantity(), a.getSuggestedReorderQuantity())));

        return suggestions;
    }

    @Override
    @Transactional(readOnly = true)
    public DeadStockSummaryDTO getDeadStockSummary() {
        // Fetch last sold dates
        List<OrderRepository.ProductLastSold> lastSoldList = orderRepository.findLastSoldDates(Order.OrderStatus.CANCELLED);
        Map<Long, LocalDate> lastSoldMap = new HashMap<>();
        for (OrderRepository.ProductLastSold ls : lastSoldList) {
            lastSoldMap.put(ls.getProductId(), ls.getLastSoldDate());
        }

        // Fetch top-selling products to suggest as bundle partners
        List<OrderRepository.ProductSales> topSales = orderRepository.findTopProductSales(
                Order.OrderStatus.CANCELLED, PageRequest.of(0, 5));
        String defaultBundlePartner = (topSales != null && !topSales.isEmpty())
                ? topSales.get(0).getProductName()
                : "Premium Chrome Basin Mixer";

        List<Product> products = productRepository.findAll();
        List<DeadStockItemDTO> deadStockItems = new ArrayList<>();

        long deadCount = 0;
        long slowCount = 0;
        long atRiskCount = 0;
        BigDecimal totalCapitalLocked = BigDecimal.ZERO;
        BigDecimal totalMonthlyCarryingCost = BigDecimal.ZERO;

        LocalDate today = LocalDate.now();

        for (Product product : products) {
            int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            if (stock <= 0) {
                continue; // only items with physical inventory count as dead stock
            }

            LocalDate lastSold = lastSoldMap.get(product.getId());
            int daysIdle;
            if (lastSold != null) {
                daysIdle = (int) ChronoUnit.DAYS.between(lastSold, today);
            } else {
                LocalDate created = product.getCreatedAt() != null ? product.getCreatedAt().toLocalDate() : today.minusDays(95);
                daysIdle = (int) ChronoUnit.DAYS.between(created, today);
            }

            if (daysIdle >= 45) {
                String tier;
                int discountPercent;
                String action;

                if (daysIdle >= 90) {
                    tier = "DEAD_STOCK";
                    deadCount++;
                    discountPercent = 30;
                    action = "Liquidation Clearance: Apply 30% contractor clearance markdown or bundle with " + defaultBundlePartner;
                } else if (daysIdle >= 60) {
                    tier = "SLOW_MOVING";
                    slowCount++;
                    discountPercent = 20;
                    action = "Promotion Bundle: Pair with " + defaultBundlePartner + " at 20% package discount";
                } else {
                    tier = "AT_RISK";
                    atRiskCount++;
                    discountPercent = 10;
                    action = "Showroom Feature: Position on front display or offer 10% sales rep incentive";
                }

                BigDecimal purchasePrice = product.getPurchasePrice() != null && product.getPurchasePrice().compareTo(BigDecimal.ZERO) > 0
                        ? product.getPurchasePrice()
                        : (product.getMrp() != null ? product.getMrp().multiply(BigDecimal.valueOf(0.65)).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO);

                BigDecimal sellingPrice = product.getSellingPrice() != null ? product.getSellingPrice() : (product.getMrp() != null ? product.getMrp() : BigDecimal.ZERO);
                BigDecimal capitalLocked = purchasePrice.multiply(BigDecimal.valueOf(stock));
                BigDecimal monthlyCost = capitalLocked.multiply(BigDecimal.valueOf(0.02)).setScale(2, RoundingMode.HALF_UP); // 2% monthly carrying cost

                totalCapitalLocked = totalCapitalLocked.add(capitalLocked);
                totalMonthlyCarryingCost = totalMonthlyCarryingCost.add(monthlyCost);

                deadStockItems.add(DeadStockItemDTO.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .sku(product.getSku())
                        .brandName(product.getBrand() != null ? product.getBrand().getName() : "Unassigned")
                        .categoryName(product.getCategory() != null ? product.getCategory().getName() : "Unassigned")
                        .color(product.getColor() != null ? product.getColor() : "Standard")
                        .material(product.getMaterial() != null ? product.getMaterial() : "Ceramic")
                        .currentStock(stock)
                        .purchasePrice(purchasePrice)
                        .sellingPrice(sellingPrice)
                        .lockedCapital(capitalLocked)
                        .monthlyCarryingCost(monthlyCost)
                        .daysIdle(daysIdle)
                        .stagnationTier(tier)
                        .lastSoldDate(lastSold)
                        .recommendedAction(action)
                        .suggestedDiscountPercent(discountPercent)
                        .suggestedBundlePartner(defaultBundlePartner)
                        .build());
            }
        }

        // Sort by capital locked descending (highest financial impact first)
        deadStockItems.sort((a, b) -> b.getLockedCapital().compareTo(a.getLockedCapital()));

        return DeadStockSummaryDTO.builder()
                .totalDeadStockSkus(deadCount)
                .totalSlowMovingSkus(slowCount)
                .totalAtRiskSkus(atRiskCount)
                .totalCapitalLocked(totalCapitalLocked)
                .totalMonthlyCarryingCost(totalMonthlyCarryingCost)
                .items(deadStockItems)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryHealthSummaryDTO getInventoryHealthSummary() {
        List<LowStockAlertDTO> alerts = getLowStockAlerts();
        List<ReorderSuggestionDTO> suggestions = getReorderSuggestions();
        DeadStockSummaryDTO deadStock = getDeadStockSummary();

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
                .deadStockSummary(deadStock)
                .build();
    }

    private int resolveLeadTimeDays(Product product) {
        if (product.getCategory() != null && product.getCategory().getLeadTimeDays() != null && product.getCategory().getLeadTimeDays() > 0) {
            return product.getCategory().getLeadTimeDays();
        }

        String name = (product.getName() + " " + (product.getCategory() != null ? product.getCategory().getName() : "")).toLowerCase();
        if (name.contains("closet") || name.contains("wc") || name.contains("basin") || name.contains("pan") || name.contains("urinal") || name.contains("commode") || name.contains("tub")) {
            return 21; // Ceramic sanitaryware lead time
        } else if (name.contains("faucet") || name.contains("mixer") || name.contains("tap") || name.contains("diverter") || name.contains("shower") || name.contains("spout")) {
            return 14; // Brassware / faucets lead time
        } else if (name.contains("vanity") || name.contains("mirror") || name.contains("cabinet")) {
            return 28; // Furniture / vanity lead time
        } else if (name.contains("pipe") || name.contains("fitting") || name.contains("coupling") || name.contains("waste") || name.contains("trap") || name.contains("valve")) {
            return 7;  // Plumbing consumables lead time
        }
        return 14; // Standard fallback
    }

    private int urgencyWeight(String urgency) {
        if ("OUT_OF_STOCK".equalsIgnoreCase(urgency)) return 1;
        if ("CRITICAL".equalsIgnoreCase(urgency)) return 2;
        return 3;
    }
}
