package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DashboardDTO;
import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

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
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
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
        long lowStockProducts = productRepository.findAll().stream().filter(p -> p.getStockQuantity() < 10).count();

        List<OrderDTO> recentOrders = orderRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(orderMapper::toDTO)
                .collect(Collectors.toList());

        // Simple mock for top products and breakdown for now
        // In a real app, these would be complex aggregate queries
        Map<String, Long> orderStatusBreakdown = new HashMap<>();
        for (Order.OrderStatus status : Order.OrderStatus.values()) {
            orderStatusBreakdown.put(status.name(), orderRepository.findByStatus(status, PageRequest.of(0, 1)).getTotalElements());
        }

        return DashboardDTO.builder()
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .totalCustomers(totalCustomers)
                .lowStockProducts(lowStockProducts)
                .recentOrders(recentOrders)
                .orderStatusBreakdown(orderStatusBreakdown)
                .build();
    }
}
