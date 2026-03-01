package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PaymentDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.PaymentRepository;
import com.sanitaryware.crm.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void recordPayment_NegativeAmount_ThrowsException() {
        // Arrange
        PaymentDTO payload = new PaymentDTO();
        payload.setOrderId(1L);
        payload.setAmount(new BigDecimal("-500.00"));
        
        Order order = new Order();
        order.setId(1L);
        order.setBalanceAmount(new BigDecimal("1000.00"));
        order.setPaidAmount(BigDecimal.ZERO);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(new User()));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            paymentService.recordPayment(payload);
        });

        assertEquals("Payment amount must be greater than zero", exception.getMessage());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void recordPayment_ZeroAmount_ThrowsException() {
        // Arrange
        PaymentDTO payload = new PaymentDTO();
        payload.setOrderId(1L);
        payload.setAmount(BigDecimal.ZERO);
        
        Order order = new Order();
        order.setId(1L);
        order.setBalanceAmount(new BigDecimal("1000.00"));
        order.setPaidAmount(BigDecimal.ZERO);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(new User()));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            paymentService.recordPayment(payload);
        });

        assertEquals("Payment amount must be greater than zero", exception.getMessage());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void recordPayment_ExceedsBalance_ThrowsException() {
        // Arrange
        PaymentDTO payload = new PaymentDTO();
        payload.setOrderId(1L);
        payload.setAmount(new BigDecimal("1500.00"));
        
        Order order = new Order();
        order.setId(1L);
        order.setBalanceAmount(new BigDecimal("1000.00"));
        order.setPaidAmount(BigDecimal.ZERO);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(new User()));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            paymentService.recordPayment(payload);
        });

        assertEquals("Payment amount ₹1500.00 exceeds the balance due ₹1000.00", exception.getMessage());
        verify(paymentRepository, never()).save(any(Payment.class));
    }
}
