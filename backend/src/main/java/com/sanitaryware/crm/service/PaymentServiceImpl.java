package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PaymentDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.PaymentMapper;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final AccessControlService accessControlService;

    @Override
    @Transactional
    public PaymentDTO recordPayment(PaymentDTO dto) {
        Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + dto.getOrderId()));
        accessControlService.requireOrderAccess(order);

        User currentUser = accessControlService.currentUser();
        validatePayment(dto, order);

        Payment payment = PaymentMapper.toEntity(dto, order, currentUser);
        if (payment.getPaymentNumber() == null) {
            payment.setPaymentNumber(generatePaymentNumber());
        }
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDate.now());
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
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        accessControlService.requireOrderAccess(payment.getOrder());
        return PaymentMapper.toDTO(payment);
    }

    @Override
    public List<PaymentDTO> getPaymentsByOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        accessControlService.requireOrderAccess(order);
        return paymentRepository.findByOrderId(orderId).stream()
                .map(PaymentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentDTO> getAllPayments() {
        User currentUser = accessControlService.currentUser();
        List<Payment> payments = accessControlService.isSales(currentUser)
                ? paymentRepository.findByOrderCreatedByUsername(currentUser.getUsername())
                : paymentRepository.findAll();
        return payments.stream()
                .map(PaymentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePayment(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        accessControlService.requireOrderAccess(payment.getOrder());

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
        for (int attempts = 0; attempts < 10; attempts++) {
            String random = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            String candidate = prefix + "-" + random;
            if (paymentRepository.findByPaymentNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return prefix + "-" + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HHmmssSSS"));
    }

    private void validatePayment(PaymentDTO dto, Order order) {
        if (dto.getAmount() == null || dto.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }
        if (dto.getPaymentMethod() == null) {
            throw new IllegalArgumentException("Payment method is required");
        }
        if (order.getBalanceAmount().compareTo(dto.getAmount()) < 0) {
            throw new IllegalArgumentException("Payment amount INR " + dto.getAmount()
                    + " exceeds the balance due INR " + order.getBalanceAmount());
        }
    }
}
