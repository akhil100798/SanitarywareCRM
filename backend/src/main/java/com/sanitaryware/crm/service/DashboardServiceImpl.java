package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DashboardDTO;
import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import com.sanitaryware.crm.entity.DistributorPayment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final OrderRepository orderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final DistributorPaymentRepository distributorPaymentRepository;
    private final OrderMapper orderMapper;

    @Override
    public DashboardDTO getDashboardStats() {
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());

        BigDecimal totalRevenue = paymentRepository.getTotalPaymentsBetweenDates(startOfMonth, endOfMonth);
        if (totalRevenue == null) totalRevenue = BigDecimal.ZERO;

        long totalOrders = orderRepository.count();
        long pendingOrders = orderRepository.findByStatus(Order.OrderStatus.PENDING, PageRequest.of(0, 1)).getTotalElements();
        long totalCustomers = customerRepository.count();
        long lowStockProducts = productRepository.findAll().stream().filter(p -> p.getStockQuantity() != null && p.getStockQuantity() < 10).count();

        // Calculate distributor payments for the month
        BigDecimal distributorPaymentsTotal = distributorPaymentRepository.findAll().stream()
                .filter(dp -> !dp.getPaymentDate().isBefore(startOfMonth) && !dp.getPaymentDate().isAfter(endOfMonth))
                .map(DistributorPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate payables and receivables
        BigDecimal totalReceivables = orderRepository.findAll().stream()
                .map(Order::getBalanceAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPayables = purchaseOrderRepository.findAll().stream()
                .map(PurchaseOrder::getBalanceAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<OrderDTO> recentOrders = orderRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(orderMapper::toDTO)
                .collect(Collectors.toList());

        // Order status breakdown across all order statuses
        Map<String, Long> orderStatusBreakdown = new HashMap<>();
        for (Order.OrderStatus status : Order.OrderStatus.values()) {
            orderStatusBreakdown.put(status.name(), orderRepository.findByStatus(status, PageRequest.of(0, 1)).getTotalElements());
        }

        // Monthly revenue for the last 6 months
        Map<String, BigDecimal> monthlyRevenue = new java.util.LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate monthDate = now.minusMonths(i);
            LocalDate monthStart = monthDate.withDayOfMonth(1);
            LocalDate monthEnd = monthDate.withDayOfMonth(monthDate.lengthOfMonth());
            String monthLabel = monthDate.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH);
            BigDecimal rev = paymentRepository.getTotalPaymentsBetweenDates(monthStart, monthEnd);
            monthlyRevenue.put(monthLabel, rev != null ? rev : BigDecimal.ZERO);
        }

        // Top 5 selling products aggregated from non-cancelled orders
        Map<String, DashboardDTO.ProductSalesDTO> productSalesMap = new HashMap<>();
        orderRepository.findAll().stream()
                .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED && o.getItems() != null)
                .flatMap(o -> o.getItems().stream())
                .forEach(item -> {
                    if (item.getProduct() != null) {
                        String name = item.getProduct().getName();
                        long qty = item.getQuantity() != null ? item.getQuantity() : 0;
                        BigDecimal total = item.getLineTotal() != null ? item.getLineTotal() : BigDecimal.ZERO;
                        productSalesMap.compute(name, (k, v) -> {
                            if (v == null) {
                                return DashboardDTO.ProductSalesDTO.builder()
                                        .productName(name)
                                        .quantitySold(qty)
                                        .totalRevenue(total)
                                        .build();
                            } else {
                                v.setQuantitySold(v.getQuantitySold() + qty);
                                v.setTotalRevenue(v.getTotalRevenue().add(total));
                                return v;
                            }
                        });
                    }
                });

        List<DashboardDTO.ProductSalesDTO> topProducts = productSalesMap.values().stream()
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .limit(5)
                .collect(Collectors.toList());

        return DashboardDTO.builder()
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .totalCustomers(totalCustomers)
                .lowStockProducts(lowStockProducts)
                .distributorPaymentsTotal(distributorPaymentsTotal)
                .totalPayables(totalPayables)
                .totalReceivables(totalReceivables)
                .recentOrders(recentOrders)
                .orderStatusBreakdown(orderStatusBreakdown)
                .monthlyRevenue(monthlyRevenue)
                .topProducts(topProducts)
                .build();
    }
}
