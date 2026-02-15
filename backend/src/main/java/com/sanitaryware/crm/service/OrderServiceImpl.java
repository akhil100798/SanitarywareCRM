package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderMapper orderMapper;

    @Override
    public OrderDTO createOrder(OrderDTO orderDTO) {
        Order order = orderMapper.toEntity(orderDTO);
        
        if (order.getOrderNumber() == null || order.getOrderNumber().isEmpty()) {
            order.setOrderNumber(generateOrderNumber());
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByUsername(username).ifPresent(order::setCreatedBy);

        if (orderDTO.getItems() != null) {
            List<OrderItem> items = orderDTO.getItems().stream()
                    .map(itemDTO -> orderMapper.toItemEntity(itemDTO, order))
                    .collect(Collectors.toList());
            order.setItems(items);
            
            // Deduct stock for confirmed orders
            if (order.getStatus() == Order.OrderStatus.CONFIRMED) {
                deductStock(items);
            }
        }

        order.calculateTotal();
        Order savedOrder = orderRepository.save(order);
        return orderMapper.toDTO(savedOrder);
    }

    @Override
    public OrderDTO createOrderFromQuotation(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + quotationId));

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setCustomer(quotation.getCustomer());
        order.setQuotation(quotation);
        order.setOrderDate(LocalDate.now());
        order.setStatus(Order.OrderStatus.PENDING);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setSubtotal(quotation.getSubtotal());
        order.setTaxPercentage(quotation.getTaxPercentage());
        order.setTaxAmount(quotation.getTaxAmount());
        order.setDiscount(quotation.getDiscount());
        order.setTotal(quotation.getTotal());
        order.setNotes("Created from Quotation: " + quotation.getQuotationNumber());

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByUsername(username).ifPresent(order::setCreatedBy);

        List<OrderItem> orderItems = quotation.getItems().stream()
                .map(qItem -> {
                    OrderItem oItem = new OrderItem();
                    oItem.setOrder(order);
                    oItem.setProduct(qItem.getProduct());
                    oItem.setQuantity(qItem.getQuantity());
                    oItem.setUnitPrice(qItem.getUnitPrice());
                    oItem.setDiscountPercentage(qItem.getDiscountPercentage());
                    oItem.setLineTotal(qItem.getLineTotal());
                    return oItem;
                }).collect(Collectors.toList());
        order.setItems(orderItems);

        // Update quotation status
        quotation.setStatus(Quotation.QuotationStatus.CONVERTED);
        quotationRepository.save(quotation);

        Order savedOrder = orderRepository.save(order);
        return orderMapper.toDTO(savedOrder);
    }

    @Override
    public OrderDTO updateOrder(Long id, OrderDTO orderDTO) {
        Order existingOrder = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        orderMapper.updateEntity(existingOrder, orderDTO);

        if (orderDTO.getItems() != null) {
            existingOrder.getItems().clear();
            List<OrderItem> updatedItems = orderDTO.getItems().stream()
                    .map(itemDTO -> orderMapper.toItemEntity(itemDTO, existingOrder))
                    .collect(Collectors.toList());
            existingOrder.getItems().addAll(updatedItems);
        }

        existingOrder.calculateTotal();
        Order updatedOrder = orderRepository.save(existingOrder);
        return orderMapper.toDTO(updatedOrder);
    }

    @Override
    public OrderDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        return orderMapper.toDTO(order);
    }

    @Override
    public Page<OrderDTO> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable).map(orderMapper::toDTO);
    }

    @Override
    public void deleteOrder(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order not found with id: " + id);
        }
        orderRepository.deleteById(id);
    }

    @Override
    public OrderDTO updateStatus(Long id, String statusString) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        
        Order.OrderStatus newStatus = Order.OrderStatus.valueOf(statusString.toUpperCase());
        
        // Logical check for stock deduction
        if (newStatus == Order.OrderStatus.CONFIRMED && order.getStatus() != Order.OrderStatus.CONFIRMED) {
            deductStock(order.getItems());
        } else if (newStatus == Order.OrderStatus.CANCELLED && order.getStatus() == Order.OrderStatus.CONFIRMED) {
            restoreStock(order.getItems());
        }

        order.setStatus(newStatus);
        return orderMapper.toDTO(orderRepository.save(order));
    }

    @Override
    public OrderDTO updatePaymentStatus(Long id, String paymentStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        
        order.setPaymentStatus(Order.PaymentStatus.valueOf(paymentStatus.toUpperCase()));
        return orderMapper.toDTO(orderRepository.save(order));
    }

    @Override
    public List<OrderDTO> getOrdersByCustomer(Long customerId) {
        return orderRepository.findByCustomerId(customerId).stream()
                .map(orderMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public String generateOrderNumber() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = "ORD-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = String.format("%04d", new java.util.Random().nextInt(10000));
        return prefix + "-" + random;
    }

    private void deductStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
            productRepository.save(product);
        }
    }

    private void restoreStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            productRepository.save(product);
        }
    }
}
