package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.OrderDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderService {
    OrderDTO createOrder(OrderDTO orderDTO);
    OrderDTO createOrderFromQuotation(Long quotationId);
    OrderDTO updateOrder(Long id, OrderDTO orderDTO);
    OrderDTO getOrderById(Long id);
    Page<OrderDTO> getAllOrders(Pageable pageable);
    void deleteOrder(Long id);
    OrderDTO updateStatus(Long id, String status);
    OrderDTO updatePaymentStatus(Long id, String paymentStatus);
    List<OrderDTO> getOrdersByCustomer(Long customerId);
    String generateOrderNumber();
}
