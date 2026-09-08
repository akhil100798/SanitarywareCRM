package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.OrderItem;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.QuotationItem;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.mapper.OrderMapper;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private QuotationRepository quotationRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private AccessControlService accessControlService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private OrderServiceImpl orderService;

    @Test
    void createOrder_ConfirmedOrderWithInsufficientStock_ThrowsException() {
        OrderDTO dto = new OrderDTO();
        dto.setStatus("CONFIRMED");
        dto.setItems(List.of(new OrderDTO.OrderItemDTO()));

        Product requestedProduct = product(1L, "SKU-1", 2);
        OrderItem item = new OrderItem();
        item.setProduct(requestedProduct);
        item.setQuantity(5);
        item.setUnitPrice(BigDecimal.TEN);
        item.calculateLineTotal();

        Order order = new Order();
        order.setItems(List.of(item));

        when(orderMapper.toEntity(dto)).thenReturn(order);
        when(orderRepository.findByOrderNumber(anyString())).thenReturn(Optional.empty());
        when(accessControlService.currentUser()).thenReturn(new User());
        when(orderMapper.toItemEntity(any(OrderDTO.OrderItemDTO.class), any(Order.class))).thenReturn(item);
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(requestedProduct));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> orderService.createOrder(dto));

        assertEquals("Insufficient stock for product SKU-1. Available: 2, requested: 5", exception.getMessage());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void createOrderFromQuotation_UnpaidOrder_BalanceEqualsTotal() {
        Product product = product(1L, "SKU-1", 10);
        QuotationItem quotationItem = new QuotationItem();
        quotationItem.setProduct(product);
        quotationItem.setQuantity(2);
        quotationItem.setUnitPrice(BigDecimal.valueOf(1000));
        quotationItem.setDiscountPercentage(BigDecimal.valueOf(5));
        quotationItem.setLineTotal(BigDecimal.valueOf(1900));

        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("QTN-1");
        quotation.setSubtotal(BigDecimal.valueOf(1900));
        quotation.setTaxPercentage(BigDecimal.valueOf(18));
        quotation.setTaxAmount(BigDecimal.valueOf(342));
        quotation.setDiscount(BigDecimal.ZERO);
        quotation.setTotal(BigDecimal.valueOf(2242));
        quotation.setItems(List.of(quotationItem));

        when(quotationRepository.findById(1L)).thenReturn(Optional.of(quotation));
        when(accessControlService.currentUser()).thenReturn(new User());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toDTO(any(Order.class))).thenReturn(new OrderDTO());

        orderService.createOrderFromQuotation(1L);

        verify(orderRepository).save(org.mockito.ArgumentMatchers.argThat(order ->
                BigDecimal.valueOf(2242).compareTo(order.getBalanceAmount()) == 0
                        && BigDecimal.ZERO.compareTo(order.getPaidAmount()) == 0));
    }

    @Test
    void createOrderFromQuotation_AlreadyConverted_ThrowsException() {
        Quotation quotation = new Quotation();
        quotation.setStatus(Quotation.QuotationStatus.CONVERTED);

        when(quotationRepository.findById(1L)).thenReturn(Optional.of(quotation));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> orderService.createOrderFromQuotation(1L));

        assertEquals("Quotation has already been converted to an order", exception.getMessage());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void updateStatus_PendingToConfirmed_DeductsStock() {
        Product prod = product(1L, "SKU-1", 10);
        OrderItem item = new OrderItem();
        item.setProduct(prod);
        item.setQuantity(4);

        Order order = new Order();
        order.setId(100L);
        order.setStatus(Order.OrderStatus.PENDING);
        order.setItems(List.of(item));

        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(prod));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDTO(any(Order.class))).thenReturn(new OrderDTO());

        orderService.updateStatus(100L, "CONFIRMED");

        assertEquals(6, prod.getStockQuantity());
        assertEquals(Order.OrderStatus.CONFIRMED, order.getStatus());
        verify(productRepository).save(prod);
        verify(orderRepository).save(order);
    }

    @Test
    void updateStatus_ConfirmedToCancelled_RestoresStock() {
        Product prod = product(1L, "SKU-1", 6);
        OrderItem item = new OrderItem();
        item.setProduct(prod);
        item.setQuantity(4);

        Order order = new Order();
        order.setId(100L);
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setItems(List.of(item));

        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(prod));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDTO(any(Order.class))).thenReturn(new OrderDTO());

        orderService.updateStatus(100L, "CANCELLED");

        assertEquals(10, prod.getStockQuantity());
        assertEquals(Order.OrderStatus.CANCELLED, order.getStatus());
        verify(productRepository).save(prod);
        verify(orderRepository).save(order);
    }

    @Test
    void updateStatus_CancelledOrder_CannotChangeStatus() {
        Order order = new Order();
        order.setId(100L);
        order.setStatus(Order.OrderStatus.CANCELLED);

        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.updateStatus(100L, "CONFIRMED"));

        assertEquals("Cannot change status of a cancelled order", ex.getMessage());
        verify(orderRepository, never()).save(any());
    }

    private Product product(Long id, String sku, int stock) {
        Product product = new Product();
        product.setId(id);
        product.setSku(sku);
        product.setName("Test product");
        product.setStockQuantity(stock);
        product.setMrp(BigDecimal.TEN);
        product.setSellingPrice(BigDecimal.TEN);
        return product;
    }

    @ParameterizedTest
    @CsvSource({"PROCESSING,CANCELLED,10", "SHIPPED,CANCELLED,10", "READY_TO_SHIP,CONFIRMED,6",
            "CONFIRMED,PROCESSING,6", "CONFIRMED,PENDING,10", "PENDING,SHIPPED,2"})
    void statusChangesAdjustStockOnlyWhenEnteringOrLeavingFulfillment(String before, String after, int expectedStock) {
        Product product = product(1L, "SKU-1", 6);
        OrderItem item = new OrderItem(); item.setProduct(product); item.setQuantity(4);
        Order order = new Order(); order.setId(100L); order.setItems(List.of(item));
        order.setStatus(Order.OrderStatus.valueOf(before));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        if (expectedStock != 6) {
            when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(product));
        }
        when(orderRepository.save(order)).thenReturn(order);
        when(orderMapper.toDTO(order)).thenReturn(new OrderDTO());

        orderService.updateStatus(100L, after);

        assertEquals(expectedStock, product.getStockQuantity());
        assertEquals(Order.OrderStatus.valueOf(after), order.getStatus());
        if (expectedStock == 6) verify(productRepository, never()).save(any());
    }

    // -----------------------------------------------------------------------
    // WORK-STATE-001 regression: PAID order must NOT be cancellable
    // -----------------------------------------------------------------------

    @Test
    void updateStatus_PaidOrderCancelled_ThrowsIllegalArgumentException() {
        Order order = new Order();
        order.setId(200L);
        order.setOrderNumber("ORD-TEST-001");
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setPaymentStatus(Order.PaymentStatus.PAID);

        when(orderRepository.findById(200L)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.updateStatus(200L, "CANCELLED"));

        assertEquals("Cannot cancel a fully paid order. Initiate a refund workflow instead.", ex.getMessage());
        // No stock mutation and no persistence should occur
        verify(productRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateStatus_UnpaidOrderCancelled_Succeeds() {
        Product prod = product(1L, "SKU-1", 6);
        OrderItem item = new OrderItem();
        item.setProduct(prod);
        item.setQuantity(4);

        Order order = new Order();
        order.setId(201L);
        order.setOrderNumber("ORD-TEST-002");
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setItems(List.of(item));

        when(orderRepository.findById(201L)).thenReturn(Optional.of(order));
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(prod));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDTO(any(Order.class))).thenReturn(new OrderDTO());

        orderService.updateStatus(201L, "CANCELLED");

        assertEquals(Order.OrderStatus.CANCELLED, order.getStatus());
        // Stock must have been restored (was CONFIRMED = reserved)
        assertEquals(10, prod.getStockQuantity());
    }

    @Test
    void updateStatus_PartiallyPaidOrderCancelled_ThrowsIllegalArgumentException() {
        Order order = new Order();
        order.setId(202L);
        order.setOrderNumber("ORD-TEST-003");
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setPaymentStatus(Order.PaymentStatus.PARTIAL);
        order.setPaidAmount(new BigDecimal("500.00"));

        when(orderRepository.findById(202L)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.updateStatus(202L, "CANCELLED"));

        assertEquals("Cannot cancel a partially paid order. Settle or reverse payments before cancelling.", ex.getMessage());
        verify(productRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateStatus_DeliveredOrderToAny_ThrowsIllegalArgumentException() {
        Order order = new Order();
        order.setId(203L);
        order.setOrderNumber("ORD-TEST-004");
        order.setStatus(Order.OrderStatus.DELIVERED);

        when(orderRepository.findById(203L)).thenReturn(Optional.of(order));

        IllegalArgumentException exPending = assertThrows(IllegalArgumentException.class,
                () -> orderService.updateStatus(203L, "PENDING"));
        assertEquals("Cannot change status of a delivered order", exPending.getMessage());

        IllegalArgumentException exCancelled = assertThrows(IllegalArgumentException.class,
                () -> orderService.updateStatus(203L, "CANCELLED"));
        assertEquals("Cannot change status of a delivered order", exCancelled.getMessage());

        verify(productRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateStatus_CancelledOrderToAny_ThrowsIllegalArgumentException() {
        Order order = new Order();
        order.setId(204L);
        order.setOrderNumber("ORD-TEST-005");
        order.setStatus(Order.OrderStatus.CANCELLED);

        when(orderRepository.findById(204L)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.updateStatus(204L, "CONFIRMED"));
        assertEquals("Cannot change status of a cancelled order", ex.getMessage());

        verify(productRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void updateOrder_DeliveredOrder_ThrowsIllegalArgumentException() {
        Order order = new Order();
        order.setId(205L);
        order.setOrderNumber("ORD-TEST-006");
        order.setStatus(Order.OrderStatus.DELIVERED);

        when(orderRepository.findById(205L)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.updateOrder(205L, new OrderDTO()));
        assertEquals("Cannot update a delivered order", ex.getMessage());
    }
}
