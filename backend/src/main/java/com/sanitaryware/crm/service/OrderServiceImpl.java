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
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
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

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private FinancialConsistencyService financialConsistency;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

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
                inventoryService.changeReservation(Map.of(), inventoryService.quantities(items));
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
        Quotation quotation = quotationRepository.findByIdForUpdate(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + quotationId));
        entityManager.refresh(quotation, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);

        accessControlService.requireQuotationAccess(quotation);
        if (quotation.getItems().stream().anyMatch(item -> item.getProduct() == null
                || !Boolean.TRUE.equals(item.getProduct().getIsAvailable()))) {
            throw new IllegalArgumentException(
                    "This quotation contains a product that is currently unavailable; update the quotation before converting it.");
        }

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
        Order existingOrder = lockedOrder(id);

        accessControlService.requireOrderAccess(existingOrder);
        financialConsistency.requireConsistent(existingOrder);

        if (existingOrder.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot update a cancelled order");
        }
        if (existingOrder.getStatus() == Order.OrderStatus.DELIVERED) {
            throw new IllegalArgumentException("Cannot update a delivered order");
        }

        Map<Long, Integer> previousReservation = reservation(existingOrder);

        orderMapper.updateEntity(existingOrder, orderDTO);

        if (orderDTO.getStatus() != null && !orderDTO.getStatus().equals(existingOrder.getStatus().name())) {
            Order.OrderStatus newStatus = parseOrderStatus(orderDTO.getStatus());
            OrderStateValidator.validateTransition(existingOrder.getStatus(), newStatus, existingOrder.derivedPaymentStatus(), existingOrder.getPaidAmount());
            existingOrder.setStatus(newStatus);
        }

        if (orderDTO.getItems() != null) {
            existingOrder.getItems().clear();
            List<OrderItem> updatedItems = orderDTO.getItems().stream()
                    .map(itemDTO -> orderMapper.toItemEntity(itemDTO, existingOrder))
                    .collect(Collectors.toList());
            existingOrder.getItems().addAll(updatedItems);
        }

        existingOrder.calculateTotal();
        financialConsistency.requirePayableTotal(existingOrder.getTotal(), existingOrder.getPaidAmount());
        inventoryService.changeReservation(previousReservation, reservation(existingOrder));
        Order updatedOrder = orderRepository.save(existingOrder);

        auditService.logEvent("UPDATE", "ORDER", updatedOrder.getId(),
                "Updated order " + updatedOrder.getOrderNumber() + " (total Rs. " + updatedOrder.getTotal() + ")");

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
        Order order = lockedOrder(id);
        accessControlService.requireOrderAccess(order);
        financialConsistency.requireConsistent(order);
        if (order.getPaidAmount().signum() > 0) {
            throw new com.sanitaryware.crm.exception.ConflictException("Reverse recorded payments before deleting this order.");
        }

        if (reservesStock(order.getStatus())) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot delete an order with reserved stock. Cancel it first to restore stock.");
        }

        orderRepository.deleteById(id);

        auditService.logEvent("DELETE", "ORDER", id,
                "Deleted order " + order.getOrderNumber());
    }

    @Override
    public OrderDTO updateStatus(Long id, String statusString) {
        Order order = lockedOrder(id);
        accessControlService.requireOrderAccess(order);
        financialConsistency.requireConsistent(order);
        
        Order.OrderStatus newStatus = parseOrderStatus(statusString);
        OrderStateValidator.validateTransition(order.getStatus(), newStatus, order.derivedPaymentStatus(), order.getPaidAmount());

        Map<Long, Integer> previous = reservation(order);
        order.setStatus(newStatus);
        inventoryService.changeReservation(previous, reservation(order));
        order.calculateBalance();
        Order saved = orderRepository.save(order);

        auditService.logEvent("STATUS_CHANGE", "ORDER", id,
                "Changed status of order " + order.getOrderNumber() + " to " + newStatus);

        return orderMapper.toDTO(saved);
    }

    @Override
    public OrderDTO updatePaymentStatus(Long id, String paymentStatus) {
        Order order = lockedOrder(id);
        accessControlService.requireOrderAccess(order);
        financialConsistency.requireConsistent(order);
        if (paymentStatus == null || Order.PaymentStatus.valueOf(paymentStatus.toUpperCase()) != order.derivedPaymentStatus()) {
            throw new com.sanitaryware.crm.exception.ConflictException("Payment status is calculated from recorded receipts. Record or reverse a payment instead.");
        }
        order.calculateBalance();
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

    private Map<Long, Integer> reservation(Order order) {
        return reservesStock(order.getStatus()) ? inventoryService.quantities(order.getItems()) : Map.of();
    }

    private Order lockedOrder(Long id) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        entityManager.refresh(order, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        return order;
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
