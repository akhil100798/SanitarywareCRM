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

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional
    public DistributorPaymentDTO createPayment(DistributorPaymentDTO dto) {
        // Load under the lock before the mapper can put a stale PO in the persistence context.
        PurchaseOrder requestedPo = dto.getPurchaseOrderId() == null ? null
                : purchaseOrderRepository.findByIdForUpdate(dto.getPurchaseOrderId())
                        .orElseThrow(() -> new com.sanitaryware.crm.exception.ResourceNotFoundException("Purchase Order not found"));
        DistributorPayment payment = paymentMapper.toEntity(dto);
        if (requestedPo != null) payment.setPurchaseOrder(requestedPo);

        if (payment.getPaymentNumber() == null || payment.getPaymentNumber().isEmpty()) {
            payment.setPaymentNumber(generatePaymentNumber());
        }

        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDate.now());
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByUsername(username).ifPresent(payment::setPaidBy);

        if (payment.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }

        PurchaseOrder po = payment.getPurchaseOrder();

        if (po != null) {
            po = purchaseOrderRepository.findByIdForUpdate(po.getId()).orElse(po);
            payment.setPurchaseOrder(po);
            if (po.getStatus() == PurchaseOrder.POStatus.CANCELLED) {
                throw new IllegalArgumentException("Cannot record payment for a cancelled Purchase Order");
            }
            // Validate and update PO balance
            if (po.getBalanceAmount().compareTo(payment.getAmount()) < 0) {
                throw new IllegalArgumentException("Payment amount ₹" + payment.getAmount() + " exceeds the PO balance ₹" + po.getBalanceAmount());
            }
            po.setPaidAmount(po.getPaidAmount().add(payment.getAmount()));
            po.calculateBalance();
            purchaseOrderRepository.save(po);

            // Update distributor outstanding balance from PO's distributor
            Distributor distributor = po.getDistributor() == null ? null
                    : distributorRepository.findByIdForUpdate(po.getDistributor().getId()).orElse(po.getDistributor());
            if (distributor != null) {
                java.math.BigDecimal balance = distributor.getOutstandingBalance() == null
                        ? java.math.BigDecimal.ZERO : distributor.getOutstandingBalance();
                distributor.setOutstandingBalance(balance.subtract(payment.getAmount()));
                distributorRepository.save(distributor);
            }
        } else if (dto.getDistributorId() != null) {
            // Independent payment linked directly to distributor (no PO)
            Distributor distributor = distributorRepository.findByIdForUpdate(dto.getDistributorId()).orElseThrow(
                    () -> new com.sanitaryware.crm.exception.ResourceNotFoundException("Distributor not found"));
            {
                java.math.BigDecimal balance = distributor.getOutstandingBalance() == null
                        ? java.math.BigDecimal.ZERO : distributor.getOutstandingBalance();
                distributor.setOutstandingBalance(balance.subtract(payment.getAmount()));
                distributorRepository.save(distributor);
                payment.setDistributor(distributor);
            }
        } else {
            throw new IllegalArgumentException("Either a Purchase Order or a Distributor must be specified for the payment.");
        }

        DistributorPayment savedPayment = paymentRepository.save(payment);

        auditService.logEvent("CREATE_DISTRIBUTOR_PAYMENT", "DISTRIBUTOR_PAYMENT", savedPayment.getId(),
                "Recorded payment " + savedPayment.getPaymentNumber() + " of Rs. " + savedPayment.getAmount() + " to distributor "
                        + (savedPayment.getDistributor() != null ? savedPayment.getDistributor().getName() : "N/A"));

        return paymentMapper.toDTO(savedPayment);
    }

    @Override
    @Transactional(readOnly = true)
    public DistributorPaymentDTO getPaymentById(Long id) {
        DistributorPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new com.sanitaryware.crm.exception.ResourceNotFoundException("Payment not found with id: " + id));
        return paymentMapper.toDTO(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DistributorPaymentDTO> getAllPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(paymentMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DistributorPaymentDTO> getPaymentsByPurchaseOrder(Long purchaseOrderId) {
        return paymentRepository.findByPurchaseOrderId(purchaseOrderId).stream()
                .map(paymentMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePayment(Long id) {
        DistributorPayment payment = paymentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new com.sanitaryware.crm.exception.ResourceNotFoundException("Payment not found with id: " + id));

        PurchaseOrder po = payment.getPurchaseOrder();
        if (po != null) {
            po = purchaseOrderRepository.findByIdForUpdate(po.getId()).orElse(po);
            payment.setPurchaseOrder(po);
            // Restore PO balance
            po.setPaidAmount(po.getPaidAmount().subtract(payment.getAmount()));
            po.calculateBalance();
            purchaseOrderRepository.save(po);

            // Restore Distributor balance
            Distributor distributor = po.getDistributor() == null ? null
                    : distributorRepository.findByIdForUpdate(po.getDistributor().getId()).orElse(po.getDistributor());
            if (distributor != null) {
                payment.setDistributor(distributor);
                distributor.setOutstandingBalance(distributor.getOutstandingBalance().add(payment.getAmount()));
                distributorRepository.save(distributor);
            }
        } else if (payment.getDistributor() != null) {
            Distributor distributor = distributorRepository.findByIdForUpdate(payment.getDistributor().getId())
                    .orElse(payment.getDistributor());
            payment.setDistributor(distributor);
            distributor.setOutstandingBalance(distributor.getOutstandingBalance().add(payment.getAmount()));
            distributorRepository.save(distributor);
        }

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
