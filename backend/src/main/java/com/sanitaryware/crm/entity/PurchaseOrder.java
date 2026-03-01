package com.sanitaryware.crm.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "purchase_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String poNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "distributor_id", nullable = false)
    private Distributor distributor;

    @Column(nullable = false)
    private LocalDate orderDate;

    @Column
    private LocalDate expectedDeliveryDate;

    @Column
    private LocalDate receivedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private POStatus status = POStatus.DRAFT;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercentage = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceAmount = BigDecimal.ZERO;

    @Column(length = 500)
    private String invoicePdfPath;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<PurchaseOrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DistributorPayment> payments = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum POStatus {
        DRAFT,
        ORDERED,
        PARTIALLY_RECEIVED,
        RECEIVED,
        CANCELLED
    }

    public void calculateTotal() {
        if (this.taxPercentage == null) this.taxPercentage = BigDecimal.ZERO;

        if (this.items == null || this.items.isEmpty()) {
            this.subtotal = BigDecimal.ZERO;
            this.taxAmount = BigDecimal.ZERO;
            this.total = BigDecimal.ZERO;
            this.calculateBalance();
            return;
        }

        this.subtotal = items.stream()
                .map(item -> {
                    if (item.getLineTotal() == null) {
                        item.calculateLineTotal();
                    }
                    return item.getLineTotal();
                })
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.taxAmount = subtotal.multiply(this.taxPercentage)
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        this.total = subtotal.add(taxAmount);

        this.calculateBalance();
    }

    public void calculateBalance() {
        if (this.total == null) this.total = BigDecimal.ZERO;
        if (this.paidAmount == null) this.paidAmount = BigDecimal.ZERO;
        this.balanceAmount = this.total.subtract(this.paidAmount);
    }
}
