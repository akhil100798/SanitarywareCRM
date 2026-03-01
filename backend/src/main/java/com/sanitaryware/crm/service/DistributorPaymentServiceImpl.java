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

    @Override
    @Transactional
    public DistributorPaymentDTO createPayment(DistributorPaymentDTO dto) {
        DistributorPayment payment = paymentMapper.toEntity(dto);

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
            // Validate and update PO balance
            if (po.getBalanceAmount().compareTo(payment.getAmount()) < 0) {
                throw new IllegalArgumentException("Payment amount ₹" + payment.getAmount() + " exceeds the PO balance ₹" + po.getBalanceAmount());
            }
            po.setPaidAmount(po.getPaidAmount().add(payment.getAmount()));
            po.calculateBalance();
            purchaseOrderRepository.save(po);

            // Update distributor outstanding balance from PO's distributor
            Distributor distributor = po.getDistributor();
            if (distributor != null) {
                distributor.setOutstandingBalance(distributor.getOutstandingBalance().subtract(payment.getAmount()));
                distributorRepository.save(distributor);
            }
        } else if (dto.getDistributorId() != null) {
            // Independent payment linked directly to distributor (no PO)
            distributorRepository.findById(dto.getDistributorId()).ifPresent(distributor -> {
                distributor.setOutstandingBalance(distributor.getOutstandingBalance().subtract(payment.getAmount()));
                distributorRepository.save(distributor);
                payment.setDistributor(distributor);
            });
        } else {
            throw new IllegalArgumentException("Either a Purchase Order or a Distributor must be specified for the payment.");
        }

        DistributorPayment savedPayment = paymentRepository.save(payment);
        return paymentMapper.toDTO(savedPayment);
    }

    @Override
    public DistributorPaymentDTO getPaymentById(Long id) {
        DistributorPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));
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
    @Transactional
    public void deletePayment(Long id) {
        DistributorPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));

        PurchaseOrder po = payment.getPurchaseOrder();
        // Restore PO balance
        po.setPaidAmount(po.getPaidAmount().subtract(payment.getAmount()));
        po.calculateBalance();
        purchaseOrderRepository.save(po);

        // Restore Distributor balance
        Distributor distributor = po.getDistributor();
        distributor.setOutstandingBalance(distributor.getOutstandingBalance().add(payment.getAmount()));
        distributorRepository.save(distributor);

        paymentRepository.delete(payment);
    }

    @Override
    public String generatePaymentNumber() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = "DPAY-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = String.format("%04d", new java.util.Random().nextInt(10000));
        return prefix + "-" + random;
    }
}
