package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
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
    private ProductRepository productRepository;

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private AccessControlService accessControlService;

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public OrderDTO createOrder(OrderDTO orderDTO) {
        Order order = orderMapper.toEntity(orderDTO);
        
        if (order.getOrderNumber() == null || order.getOrderNumber().isEmpty()) {
            order.setOrderNumber(generateOrderNumber());
        }
        if (orderDTO.getStatus() != null && !orderDTO.getStatus().isBlank()) {
            order.setStatus(parseOrderStatus(orderDTO.getStatus()));
        }


        order.setCreatedBy(accessControlService.currentUser());

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

        if (quotation.getStatus() == Quotation.QuotationStatus.CONVERTED) {
            throw new IllegalArgumentException("Quotation has already been converted to an order");
        }

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
        order.calculateBalance();
        order.setNotes("Created from Quotation: " + quotation.getQuotationNumber());

        order.setCreatedBy(accessControlService.currentUser());

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

        accessControlService.requireOrderAccess(existingOrder);
        boolean wasConfirmed = existingOrder.getStatus() == Order.OrderStatus.CONFIRMED;
        List<OrderItem> previousItems = List.copyOf(existingOrder.getItems());

        orderMapper.updateEntity(existingOrder, orderDTO);

        if (orderDTO.getItems() != null) {
            if (wasConfirmed) {
                restoreStock(previousItems);
            }
            existingOrder.getItems().clear();
            List<OrderItem> updatedItems = orderDTO.getItems().stream()
                    .map(itemDTO -> orderMapper.toItemEntity(itemDTO, existingOrder))
                    .collect(Collectors.toList());
            existingOrder.getItems().addAll(updatedItems);
            if (wasConfirmed) {
                deductStock(updatedItems);
            }
        }

        existingOrder.calculateTotal();
        Order updatedOrder = orderRepository.save(existingOrder);
        return orderMapper.toDTO(updatedOrder);
    }

    @Override
    public OrderDTO getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        accessControlService.requireOrderAccess(order);
        return orderMapper.toDTO(order);
    }

    @Override
    public Page<OrderDTO> getAllOrders(Pageable pageable) {
        User currentUser = accessControlService.currentUser();
        if (accessControlService.isSales(currentUser)) {
            return orderRepository.findByCreatedByUsername(currentUser.getUsername(), pageable).map(orderMapper::toDTO);
        }
        return orderRepository.findAll(pageable).map(orderMapper::toDTO);
    }

    @Override
    public void deleteOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        accessControlService.requireOrderAccess(order);
        orderRepository.deleteById(id);
    }

    @Override
    public OrderDTO updateStatus(Long id, String statusString) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        accessControlService.requireOrderAccess(order);
        
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
        accessControlService.requireOrderAccess(order);
        
        order.setPaymentStatus(Order.PaymentStatus.valueOf(paymentStatus.toUpperCase()));
        return orderMapper.toDTO(orderRepository.save(order));
    }

    @Override
    public List<OrderDTO> getOrdersByCustomer(Long customerId) {
        User currentUser = accessControlService.currentUser();
        List<Order> orders = accessControlService.isSales(currentUser)
                ? orderRepository.findByCustomerIdAndCreatedByUsername(customerId, currentUser.getUsername())
                : orderRepository.findByCustomerId(customerId);
        return orders.stream()
                .map(orderMapper::toDTO)
                .collect(Collectors.toList());
    }

    private Order.OrderStatus parseOrderStatus(String status) {
        try {
            return Order.OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid order status: " + status);
        }
    }

    @Override
    public String generateOrderNumber() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = "ORD-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int attempts = 0; attempts < 10; attempts++) {
            String random = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            String candidate = prefix + "-" + random;
            if (orderRepository.findByOrderNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return prefix + "-" + now.format(DateTimeFormatter.ofPattern("HHmmssSSS"));
    }

    private void deductStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            if (item.getQuantity() <= 0) {
                continue; // Skip invalid quantities to prevent stock inflation
            }
            if (item.getProduct() == null || item.getProduct().getId() == null) {
                throw new IllegalArgumentException("Order item product is required");
            }
            Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + item.getProduct().getId()));
            int availableStock = product.getStockQuantity() == null ? 0 : product.getStockQuantity();
            if (availableStock < item.getQuantity()) {
                throw new IllegalArgumentException("Insufficient stock for product " + product.getSku()
                        + ". Available: " + availableStock + ", requested: " + item.getQuantity());
            }
            product.setStockQuantity(availableStock - item.getQuantity());
            productRepository.save(product);
            item.setProduct(product);
        }
    }

    private void restoreStock(List<OrderItem> items) {
        for (OrderItem item : items) {
            if (item.getQuantity() <= 0) {
                continue; // Skip invalid quantities
            }
            if (item.getProduct() == null || item.getProduct().getId() == null) {
                throw new IllegalArgumentException("Order item product is required");
            }
            Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + item.getProduct().getId()));
            int availableStock = product.getStockQuantity() == null ? 0 : product.getStockQuantity();
            product.setStockQuantity(availableStock + item.getQuantity());
            productRepository.save(product);
            item.setProduct(product);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getOrderInvoicePdf(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        accessControlService.requireOrderAccess(order);
        return pdfGeneratorService.generateOrderInvoicePdf(order);
    }
}
