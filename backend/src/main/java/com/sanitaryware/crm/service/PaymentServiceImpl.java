package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PaymentDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.PaymentMapper;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.PaymentRepository;
import com.sanitaryware.crm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public PaymentDTO recordPayment(PaymentDTO dto) {
        Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + dto.getOrderId()));

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        Payment payment = PaymentMapper.toEntity(dto, order, currentUser);
        if (payment.getPaymentNumber() == null) {
            payment.setPaymentNumber(generatePaymentNumber());
        }
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDate.now());
        }

        // Validate Order balance and amount
        if (payment.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }
        if (order.getBalanceAmount().compareTo(payment.getAmount()) < 0) {
            throw new IllegalArgumentException("Payment amount ₹" + payment.getAmount() + " exceeds the balance due ₹" + order.getBalanceAmount());
        }

        Payment savedPayment = paymentRepository.save(payment);

        order.setPaidAmount(order.getPaidAmount().add(payment.getAmount()));
        order.calculateBalance();
        
        if (order.getBalanceAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            order.setPaymentStatus(Order.PaymentStatus.PAID);
        } else if (order.getPaidAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            order.setPaymentStatus(Order.PaymentStatus.PARTIAL);
        }
        
        orderRepository.save(order);

        return PaymentMapper.toDTO(savedPayment);
    }

    @Override
    public PaymentDTO getPaymentById(Long id) {
        return paymentRepository.findById(id)
                .map(PaymentMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
    }

    @Override
    public List<PaymentDTO> getPaymentsByOrder(Long orderId) {
        return paymentRepository.findByOrderId(orderId).stream()
                .map(PaymentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentDTO> getAllPayments() {
        return paymentRepository.findAll().stream()
                .map(PaymentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePayment(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        
        Order order = payment.getOrder();
        order.setPaidAmount(order.getPaidAmount().subtract(payment.getAmount()));
        order.calculateBalance();
        
        if (order.getPaidAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        } else if (order.getBalanceAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            order.setPaymentStatus(Order.PaymentStatus.PARTIAL);
        } else {
             order.setPaymentStatus(Order.PaymentStatus.PAID);
        }
        
        orderRepository.save(order);
        paymentRepository.delete(payment);
    }

    @Override
    public String generatePaymentNumber() {
        String prefix = "PAY-" + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyMMdd"));
        String random = String.format("%04d", new java.util.Random().nextInt(10000));
        return prefix + "-" + random;
    }
}
