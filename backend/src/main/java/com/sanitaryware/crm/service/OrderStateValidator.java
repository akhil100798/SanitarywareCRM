package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Order;

import java.math.BigDecimal;

public final class OrderStateValidator {

    private OrderStateValidator() {}

    /**
     * Authoritative transition validator for order state machine.
     * Enforces:
     * 1. CANCELLED is terminal: outbound transitions rejected.
     * 2. DELIVERED is terminal: completed fulfillment cannot be altered/rewritten.
     * 3. Cancellation financial invariant (Policy A):
     *    - UNPAID orders can be cancelled.
     *    - PARTIAL and PAID orders cannot be directly cancelled without refund/reversal.
     */
    public static void validateTransition(
            Order.OrderStatus currentStatus,
            Order.OrderStatus targetStatus,
            Order.PaymentStatus paymentStatus,
            BigDecimal paidAmount
    ) {
        if (targetStatus == null) {
            throw new IllegalArgumentException("Target order status is required");
        }

        if (currentStatus == targetStatus) {
            return;
        }

        if (currentStatus == Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot change status of a cancelled order");
        }

        if (currentStatus == Order.OrderStatus.DELIVERED) {
            throw new IllegalArgumentException("Cannot change status of a delivered order");
        }

        if (targetStatus == Order.OrderStatus.CANCELLED) {
            if (paymentStatus == Order.PaymentStatus.PAID) {
                throw new IllegalArgumentException(
                        "Cannot cancel a fully paid order. Initiate a refund workflow instead.");
            }
            if (paymentStatus == Order.PaymentStatus.PARTIAL
                    || (paidAmount != null && paidAmount.compareTo(BigDecimal.ZERO) > 0)) {
                throw new IllegalArgumentException(
                        "Cannot cancel a partially paid order. Settle or reverse payments before cancelling.");
            }
        }
    }
}
