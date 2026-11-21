package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.DistributorPayment;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.mapper.DistributorPaymentMapper;
import com.sanitaryware.crm.repository.DistributorPaymentRepository;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import com.sanitaryware.crm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DistributorPaymentServiceImpl implements DistributorPaymentService {

    private final DistributorPaymentRepository paymentRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DistributorRepository distributorRepository;
    private final UserRepository userRepository;
    private final DistributorPaymentMapper paymentMapper;
    private final AuditService auditService;
    private final PurchaseOrderLockService locks;
    private final FinancialConsistencyService financialConsistency;
    private final PaymentIdempotencyService idempotency;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public DistributorPaymentDTO createPayment(DistributorPaymentDTO dto) {
        return createPayment(dto, null);
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public DistributorPaymentDTO createPayment(DistributorPaymentDTO dto, String key) {
        if (dto.getAmount() == null || dto.getAmount().signum() <= 0) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment amount must be greater than zero");
        }
        try {
            dto.getAmount().setScale(2, java.math.RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment amounts must have at most two decimal places");
        }
        if (dto.getPaymentMethod() == null) throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment method is required");
        DistributorPayment.PaymentMethod method = DistributorPayment.PaymentMethod.valueOf(dto.getPaymentMethod().toUpperCase(java.util.Locale.ROOT));
        PurchaseOrder po = dto.getPurchaseOrderId() == null ? null : locks.purchaseOrder(dto.getPurchaseOrderId(), null);
        Distributor distributor = po == null ? locks.distributor(dto.getDistributorId()) : po.getDistributor();
        if (po != null && dto.getDistributorId() != null && !dto.getDistributorId().equals(distributor.getId())) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("The selected supplier does not own this purchase order");
        }
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        com.sanitaryware.crm.entity.User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new com.sanitaryware.crm.exception.ResourceNotFoundException("User not found"));
        String fingerprint = key == null ? null : idempotency.fingerprint(dto.getPurchaseOrderId(), dto.getDistributorId(),
                dto.getAmount().stripTrailingZeros().toPlainString(), dto.getPaymentDate(), method, dto.getReferenceNumber(), dto.getNotes());
        if (key != null) {
            var replay = idempotency.replay(actor.getId(), "SUPPLIER_PAYMENT", key, fingerprint,
                    DistributorPaymentDTO.class, paymentRepository::existsById);
            if (replay.isPresent()) return replay.get();
        }
        DistributorPayment payment = paymentMapper.toEntity(dto);
        payment.setPurchaseOrder(po);
        payment.setDistributor(distributor);
        payment.setPaidBy(actor);
        payment.setPaymentMethod(method);
        payment.setPaymentNumber(generatePaymentNumber());
        if (payment.getPaymentDate() == null) payment.setPaymentDate(LocalDate.now());
        if (po != null) {
            financialConsistency.requireConsistent(po);
            if (po.getStatus() == PurchaseOrder.POStatus.CANCELLED) {
                throw new com.sanitaryware.crm.exception.BusinessValidationException("Cannot record payment for a cancelled Purchase Order");
            }
            // Validate and update PO balance
            if (po.getBalanceAmount().compareTo(payment.getAmount()) < 0) {
                throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment amount INR " + payment.getAmount() + " exceeds the PO balance INR " + po.getBalanceAmount());
            }
            po.setPaidAmount(po.getPaidAmount().add(payment.getAmount()));
            po.calculateBalance();
            purchaseOrderRepository.save(po);

        } else if (distributor.getOutstandingBalance() != null && payment.getAmount().compareTo(distributor.getOutstandingBalance()) > 0) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Payment amount exceeds outstanding distributor balance");
        }
        // Payments before receipt are supplier advances. Receiving the PO later
        // adds its full liability, not its already-reduced remaining balance.
        distributor.setOutstandingBalance(distributor.getOutstandingBalance().subtract(payment.getAmount()));
        distributorRepository.save(distributor);

        DistributorPayment savedPayment = paymentRepository.save(payment);

        auditService.logEvent("CREATE_DISTRIBUTOR_PAYMENT", "DISTRIBUTOR_PAYMENT", savedPayment.getId(),
                "Recorded payment " + savedPayment.getPaymentNumber() + " of Rs. " + savedPayment.getAmount() + " to distributor "
                        + (savedPayment.getDistributor() != null ? savedPayment.getDistributor().getName() : "N/A"));

        paymentRepository.flush();
        DistributorPaymentDTO response = paymentMapper.toDTO(savedPayment);
        idempotency.remember(actor.getId(), "SUPPLIER_PAYMENT", key, fingerprint, savedPayment.getId(), response);
        return response;
    }

    @Override
    public DistributorPaymentDTO getPaymentById(Long id) {
        DistributorPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new com.sanitaryware.crm.exception.ResourceNotFoundException("Payment not found with id: " + id));
        return paymentMapper.toDTO(payment);
    }

    @Override
    public Page<DistributorPaymentDTO> getAllPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(paymentMapper::toDTO);
    }

    @Override
    public List<DistributorPaymentDTO> getPaymentsByPurchaseOrder(Long purchaseOrderId) {
        return paymentRepository.findByPurchaseOrderId(purchaseOrderId).stream()
                .map(paymentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void deletePayment(Long id) {
        DistributorPayment initial = paymentRepository.findById(id)
                .orElseThrow(() -> new com.sanitaryware.crm.exception.ResourceNotFoundException("Payment not found with id: " + id));
        PurchaseOrder po = initial.getPurchaseOrder() == null ? null : locks.purchaseOrder(initial.getPurchaseOrder().getId(), null);
        Distributor distributor = po == null ? locks.distributor(initial.getDistributor().getId()) : po.getDistributor();
        if (po != null) financialConsistency.requireConsistent(po);
        DistributorPayment payment = paymentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new com.sanitaryware.crm.exception.ResourceNotFoundException("Payment not found with id: " + id));
        if (po != null) {
            // Restore PO balance
            po.setPaidAmount(po.getPaidAmount().subtract(payment.getAmount()));
            po.calculateBalance();
            purchaseOrderRepository.save(po);

        }
        distributor.setOutstandingBalance(distributor.getOutstandingBalance().add(payment.getAmount()));
        distributorRepository.save(distributor);

        if (po != null) po.getPayments().removeIf(receipt -> receipt.getId().equals(id));
        paymentRepository.delete(payment);

        auditService.logEvent("DELETE_DISTRIBUTOR_PAYMENT", "DISTRIBUTOR_PAYMENT", id,
                "Deleted distributor payment " + payment.getPaymentNumber() + " of Rs. " + payment.getAmount());
    }

    @Override
    public String generatePaymentNumber() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = "DPAY-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int attempts = 0; attempts < 10; attempts++) {
            String random = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            String candidate = prefix + "-" + random;
            if (paymentRepository.findByPaymentNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return prefix + "-" + now.format(DateTimeFormatter.ofPattern("HHmmssSSS"));
    }
}
