package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.repository.PaymentRepository;
import com.sanitaryware.crm.repository.DistributorPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;

@Service @RequiredArgsConstructor
public class FinancialConsistencyService {
    private final PaymentRepository payments;
    private final DistributorPaymentRepository supplierPayments;

    public void requireConsistent(Order order) {
        BigDecimal ledger = payments.findForOrderForUpdate(order.getId()).stream()
                .map(p -> p.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        requireBalances(order.getTotal(), order.getPaidAmount(), order.getBalanceAmount(), ledger);
    }

    public void requireConsistent(PurchaseOrder order) {
        BigDecimal ledger = supplierPayments.findForPurchaseOrderForUpdate(order.getId()).stream()
                .map(p -> p.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        requireBalances(order.getTotal(), order.getPaidAmount(), order.getBalanceAmount(), ledger);
    }

    private void requireBalances(BigDecimal total, BigDecimal paid, BigDecimal balance, BigDecimal ledger) {
        if (total == null || paid == null || balance == null || paid.compareTo(ledger) != 0
                || balance.compareTo(total.subtract(ledger)) != 0 || ledger.signum() < 0 || total.compareTo(ledger) < 0) {
            throw new ConflictException("Recorded payments and order balances do not reconcile. Request financial reconciliation before changing this order.");
        }
    }

    public void requirePayableTotal(BigDecimal total, BigDecimal paid) {
        if (total.compareTo(paid) < 0) {
            throw new ConflictException("The order total cannot be reduced below recorded payments. Reverse or reconcile the payments first.");
        }
    }
}
