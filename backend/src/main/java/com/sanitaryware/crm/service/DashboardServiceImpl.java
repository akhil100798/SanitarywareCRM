package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DashboardDTO;
import com.sanitaryware.crm.dto.DashboardOrderDTO;
import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final AccessControlService accessControlService;

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO getDashboardStats() {
        var currentUser = accessControlService.currentUser();
        boolean canViewFinancials = currentUser != null && (currentUser.getRole() == com.sanitaryware.crm.entity.User.UserRole.ADMIN
                || currentUser.getRole() == com.sanitaryware.crm.entity.User.UserRole.MANAGER);
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());

        BigDecimal totalRevenue = canViewFinancials ? paymentRepository.getTotalPaymentsBetweenDates(startOfMonth, endOfMonth) : null;
        if (canViewFinancials && totalRevenue == null) totalRevenue = BigDecimal.ZERO;

        long totalOrders = orderRepository.count();
        long totalCustomers = customerRepository.count();
        // Preserve the dashboard's existing <10 threshold (catalogue alerts use reorderLevel).
        long lowStockProducts = productRepository.countByStockQuantityLessThan(10);
        BigDecimal distributorPaymentsTotal = canViewFinancials ? distributorPaymentRepository
                .getTotalDistributorPaymentsBetweenDates(startOfMonth, endOfMonth) : null;
        BigDecimal totalReceivables = canViewFinancials ? orderRepository.getTotalBalance() : null;
        BigDecimal totalPayables = canViewFinancials ? purchaseOrderRepository.getTotalBalance() : null;

        var recentPage = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<DashboardOrderDTO> recentOrders = (accessControlService.isSales(currentUser)
                ? orderRepository.findByCreatedByUsername(currentUser.getUsername(), recentPage)
                : orderRepository.findAll(recentPage))
                .stream()
                .map(orderMapper::toDTO)
                .map(order -> DashboardOrderDTO.builder()
                        .id(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .customerName(order.getCustomerName())
                        .status(order.getStatus())
                        .total(canViewFinancials ? order.getTotal() : null)
                        .build())
                .collect(Collectors.toList());

        // Order status breakdown across all order statuses
        Map<String, Long> orderStatusBreakdown = new HashMap<>();
        for (Order.OrderStatus status : Order.OrderStatus.values()) {
            orderStatusBreakdown.put(status.name(), 0L);
        }

        orderRepository.countByStatus().forEach(row ->
                orderStatusBreakdown.put(row.getStatus().name(), row.getCount()));
        long pendingOrders = orderStatusBreakdown.get(Order.OrderStatus.PENDING.name());

        // Monthly revenue for the last 6 months
        Map<String, BigDecimal> monthlyRevenue = new java.util.LinkedHashMap<>();
        for (int i = 5; canViewFinancials && i >= 0; i--) {
            LocalDate monthDate = now.minusMonths(i);
            LocalDate monthStart = monthDate.withDayOfMonth(1);
            LocalDate monthEnd = monthDate.withDayOfMonth(monthDate.lengthOfMonth());
            String monthLabel = monthDate.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH);
            BigDecimal rev = i == 0 ? totalRevenue : paymentRepository.getTotalPaymentsBetweenDates(monthStart, monthEnd);
            monthlyRevenue.put(monthLabel, rev != null ? rev : BigDecimal.ZERO);
        }

        List<DashboardDTO.ProductSalesDTO> topProducts = canViewFinancials ? orderRepository
                .findTopProductSales(Order.OrderStatus.CANCELLED, PageRequest.of(0, 5)).stream()
                .map(row -> new DashboardDTO.ProductSalesDTO(
                        row.getProductName(), row.getQuantitySold(), row.getTotalRevenue()))
                .toList() : null;

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
                .monthlyRevenue(canViewFinancials ? monthlyRevenue : null)
                .topProducts(topProducts)
                .build();
    }
}
