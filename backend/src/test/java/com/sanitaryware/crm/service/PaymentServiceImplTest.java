package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PaymentDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordPayment_NegativeAmount_ThrowsException() {
        PaymentDTO payload = paymentPayload("-500.00");
        Order order = orderWithBalance("1000.00");

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(accessControlService.currentUser()).thenReturn(new User());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> paymentService.recordPayment(payload));

        assertEquals("Payment amount must be greater than zero", exception.getMessage());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void recordPayment_ZeroAmount_ThrowsException() {
        PaymentDTO payload = paymentPayload("0.00");
        Order order = orderWithBalance("1000.00");

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(accessControlService.currentUser()).thenReturn(new User());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> paymentService.recordPayment(payload));

        assertEquals("Payment amount must be greater than zero", exception.getMessage());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void recordPayment_ExceedsBalance_ThrowsException() {
        PaymentDTO payload = paymentPayload("1500.00");
        Order order = orderWithBalance("1000.00");

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(accessControlService.currentUser()).thenReturn(new User());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> paymentService.recordPayment(payload));

        assertEquals("Payment amount INR 1500.00 exceeds the balance due INR 1000.00", exception.getMessage());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    private PaymentDTO paymentPayload(String amount) {
        PaymentDTO payload = new PaymentDTO();
        payload.setOrderId(1L);
        payload.setAmount(new BigDecimal(amount));
        payload.setPaymentMethod(Payment.PaymentMethod.CASH);
        return payload;
    }

    private Order orderWithBalance(String balance) {
        Order order = new Order();
        order.setId(1L);
        order.setBalanceAmount(new BigDecimal(balance));
        order.setPaidAmount(BigDecimal.ZERO);
        return order;
    }
}
