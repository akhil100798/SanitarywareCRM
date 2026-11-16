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
    private final AuditService auditService;
    private final FinancialConsistencyService financialConsistency;
    private final PaymentIdempotencyService idempotency;
    private final jakarta.persistence.EntityManager entityManager;

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PaymentDTO recordPayment(PaymentDTO dto) {
        return recordPayment(dto, null);
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PaymentDTO recordPayment(PaymentDTO dto, String key) {
        Order order = orderRepository.findByIdForUpdate(dto.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + dto.getOrderId()));
        entityManager.refresh(order, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        accessControlService.requireOrderAccess(order);

        User currentUser = accessControlService.currentUser();
        String fingerprint = key == null ? null : idempotency.fingerprint(dto.getOrderId(),
                dto.getAmount() == null ? null : dto.getAmount().stripTrailingZeros().toPlainString(),
                dto.getPaymentDate(), dto.getPaymentMethod(), dto.getPaymentNumber(), dto.getReferenceNumber(), dto.getNotes());
        if (key != null) {
            var replay = idempotency.replay(currentUser.getId(), "CUSTOMER_PAYMENT", key, fingerprint,
                    PaymentDTO.class, paymentRepository::existsById);
            if (replay.isPresent()) return replay.get();
        }
        financialConsistency.requireConsistent(order);
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

        orderRepository.save(order);

        auditService.logEvent("RECORD_PAYMENT", "PAYMENT", savedPayment.getId(),
                "Recorded payment " + savedPayment.getPaymentNumber() + " of Rs. " + savedPayment.getAmount() + " for order " + order.getOrderNumber());

        paymentRepository.flush();
        PaymentDTO response = PaymentMapper.toDTO(savedPayment);
        idempotency.remember(currentUser.getId(), "CUSTOMER_PAYMENT", key, fingerprint, savedPayment.getId(), response);
        return response;
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
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void deletePayment(Long id) {
        Long orderId = paymentRepository.findOrderIdById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        entityManager.refresh(order, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        accessControlService.requireOrderAccess(order);
        financialConsistency.requireConsistent(order);
        Payment payment = paymentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        order.setPaidAmount(order.getPaidAmount().subtract(payment.getAmount()));
        order.calculateBalance();

        orderRepository.save(order);
        order.getPayments().removeIf(receipt -> receipt.getId().equals(id));
        paymentRepository.delete(payment);

        auditService.logEvent("DELETE_PAYMENT", "PAYMENT", id,
                "Deleted payment " + payment.getPaymentNumber() + " of Rs. " + payment.getAmount() + " (recalculated order " + order.getOrderNumber() + " balance to Rs. " + order.getBalanceAmount() + ")");
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
        if (order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Cannot record payment for a cancelled order");
        }
        if (dto.getAmount() == null || dto.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment amount must be greater than zero");
        }
        try {
            dto.getAmount().setScale(2, java.math.RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment amounts must have at most two decimal places");
        }
        if (dto.getPaymentMethod() == null) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment method is required");
        }
        if (order.getBalanceAmount().compareTo(dto.getAmount()) < 0) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment amount INR " + dto.getAmount()
                    + " exceeds the balance due INR " + order.getBalanceAmount());
        }
    }
}
