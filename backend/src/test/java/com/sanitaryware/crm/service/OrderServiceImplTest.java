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
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
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
}
