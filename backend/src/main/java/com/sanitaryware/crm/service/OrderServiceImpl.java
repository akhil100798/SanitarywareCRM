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

    @Autowired
    private AuditService auditService;

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
            
            // Reserve stock when an order enters fulfillment
            if (reservesStock(order.getStatus())) {
                deductStock(items);
            }
        }

        order.calculateTotal();
        Order savedOrder = orderRepository.save(order);

        auditService.logEvent("CREATE", "ORDER", savedOrder.getId(),
                "Created order " + savedOrder.getOrderNumber() + " with total Rs. " + savedOrder.getTotal() + " (status: " + savedOrder.getStatus() + ")");

        return orderMapper.toDTO(savedOrder);
    }

    @Override
    public OrderDTO createOrderFromQuotation(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + quotationId));

        accessControlService.requireQuotationAccess(quotation);

        if (quotation.getStatus() == Quotation.QuotationStatus.CONVERTED) {
            throw new IllegalArgumentException("Quotation has already been converted to an order");
        }
        if (quotation.getStatus() == Quotation.QuotationStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot convert a rejected quotation");
        }

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setCustomer(quotation.getCustomer());
        order.setQuotation(quotation);
        order.setOrderDate(LocalDate.now());
        order.setStatus(Order.OrderStatus.PENDING);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setTaxPercentage(quotation.getTaxPercentage());
        order.setDiscount(quotation.getDiscount());
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
                    oItem.setBarcode(qItem.getBarcode() != null ? qItem.getBarcode() : (qItem.getProduct() != null ? qItem.getProduct().getBarcode() : null));
                    oItem.setHsnCode(qItem.getHsnCode() != null ? qItem.getHsnCode() : (qItem.getProduct() != null ? qItem.getProduct().getHsnCode() : null));
                    oItem.setGstRate(qItem.getGstRate() != null ? qItem.getGstRate() : (qItem.getProduct() != null ? qItem.getProduct().getGstRate() : null));
                    return oItem;
                }).collect(Collectors.toList());
        order.setItems(orderItems);
        // Recalculate from the copied primitive values so headers cannot retain
        // a total that disagrees with converted line items.
        orderItems.forEach(OrderItem::calculateLineTotal);
        order.calculateTotal();

        // Update quotation status
        quotation.setStatus(Quotation.QuotationStatus.CONVERTED);
        quotationRepository.save(quotation);

        Order savedOrder = orderRepository.save(order);

        auditService.logEvent("CONVERT_FROM_QUOTATION", "ORDER", savedOrder.getId(),
                "Converted quotation " + quotation.getQuotationNumber() + " into order " + savedOrder.getOrderNumber());

        return orderMapper.toDTO(savedOrder);
    }

    @Override
    public OrderDTO updateOrder(Long id, OrderDTO orderDTO) {
        Order existingOrder = findOrderForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        accessControlService.requireOrderAccess(existingOrder);

        if (existingOrder.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot update a cancelled order");
        }
        if (existingOrder.getStatus() == Order.OrderStatus.DELIVERED) {
            throw new IllegalArgumentException("Cannot update a delivered order");
        }

        Order.OrderStatus previousStatus = existingOrder.getStatus();
        Order.OrderStatus targetStatus = previousStatus;
        if (orderDTO.getStatus() != null && !orderDTO.getStatus().isBlank()) {
            targetStatus = parseOrderStatus(orderDTO.getStatus());
            OrderStateValidator.validateTransition(previousStatus, targetStatus,
                    existingOrder.getPaymentStatus(), existingOrder.getPaidAmount());
        }
        List<OrderItem> previousItems = List.copyOf(existingOrder.getItems());

        orderMapper.updateEntity(existingOrder, orderDTO);
        existingOrder.setStatus(targetStatus);

        if (orderDTO.getItems() != null) {
            if (reservesStock(previousStatus)) {
                restoreStock(previousItems);
            }
            existingOrder.getItems().clear();
            List<OrderItem> updatedItems = orderDTO.getItems().stream()
                    .map(itemDTO -> orderMapper.toItemEntity(itemDTO, existingOrder))
                    .collect(Collectors.toList());
            existingOrder.getItems().addAll(updatedItems);
            if (reservesStock(targetStatus)) {
                deductStock(updatedItems);
            }
        } else if (reservesStock(targetStatus) && !reservesStock(previousStatus)) {
            deductStock(existingOrder.getItems());
        } else if (!reservesStock(targetStatus) && reservesStock(previousStatus)) {
            restoreStock(existingOrder.getItems());
        }

        existingOrder.calculateTotal();
        Order updatedOrder = orderRepository.save(existingOrder);

        auditService.logEvent("UPDATE", "ORDER", updatedOrder.getId(),
                "Updated order " + updatedOrder.getOrderNumber() + " (total Rs. " + updatedOrder.getTotal() + ")");

        return orderMapper.toDTO(updatedOrder);
    }

    @Override
    public OrderDTO getOrderById(Long id) {
        Order order = findOrderForUpdate(id)
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
        Order order = findOrderForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        accessControlService.requireOrderAccess(order);

        if (reservesStock(order.getStatus())) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot delete an order with reserved stock. Cancel it first to restore stock.");
        }

        orderRepository.deleteById(id);

        auditService.logEvent("DELETE", "ORDER", id,
                "Deleted order " + order.getOrderNumber());
    }

    @Override
    public OrderDTO updateStatus(Long id, String statusString) {
        Order order = findOrderForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        accessControlService.requireOrderAccess(order);
        
        Order.OrderStatus newStatus = parseOrderStatus(statusString);
        OrderStateValidator.validateTransition(order.getStatus(), newStatus, order.getPaymentStatus(), order.getPaidAmount());

        // Adjust stock only when crossing the reservation boundary
        if (reservesStock(newStatus) && !reservesStock(order.getStatus())) {
            deductStock(order.getItems());
        } else if (!reservesStock(newStatus) && reservesStock(order.getStatus())) {
            restoreStock(order.getItems());
        }

        order.setStatus(newStatus);
        Order saved = orderRepository.save(order);

        auditService.logEvent("STATUS_CHANGE", "ORDER", id,
                "Changed status of order " + order.getOrderNumber() + " to " + newStatus);

        return orderMapper.toDTO(saved);
    }

    @Override
    public OrderDTO updatePaymentStatus(Long id, String paymentStatus) {
        Order order = findOrderForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        accessControlService.requireOrderAccess(order);
        
        Order.PaymentStatus requested;
        try {
            requested = Order.PaymentStatus.valueOf(paymentStatus.toUpperCase());
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("Invalid payment status: " + paymentStatus);
        }
        Order.PaymentStatus derived = derivePaymentStatus(order);
        if (requested != derived) {
            throw new IllegalArgumentException("Payment status is derived from the payment ledger; record or reverse a payment instead");
        }
        order.setPaymentStatus(derived);
        Order saved = orderRepository.save(order);

        auditService.logEvent("PAYMENT_STATUS_CHANGE", "ORDER", id,
                "Changed payment status of order " + order.getOrderNumber() + " to " + paymentStatus);

        return orderMapper.toDTO(saved);
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

    // Every fulfillment status holds stock until the order returns to pending or is cancelled.
    private boolean reservesStock(Order.OrderStatus status) {
        return status != Order.OrderStatus.PENDING && status != Order.OrderStatus.CANCELLED;
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

    private java.util.Optional<Order> findOrderForUpdate(Long id) {
        java.util.Optional<Order> locked = orderRepository.findByIdForUpdate(id);
        return locked.isPresent() ? locked : orderRepository.findById(id);
    }

    private Order.PaymentStatus derivePaymentStatus(Order order) {
        if (order.getPaidAmount() == null || order.getPaidAmount().signum() <= 0) return Order.PaymentStatus.UNPAID;
        if (order.getBalanceAmount() != null && order.getBalanceAmount().signum() <= 0) return Order.PaymentStatus.PAID;
        return Order.PaymentStatus.PARTIAL;
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
