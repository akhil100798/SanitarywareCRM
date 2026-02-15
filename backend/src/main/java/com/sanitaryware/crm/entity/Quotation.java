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
@Table(name = "quotations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String quotationNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(nullable = false)
    private LocalDate quotationDate;

    @Column(nullable = false)
    private LocalDate validUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuotationStatus status = QuotationStatus.DRAFT;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercentage = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String termsAndConditions;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<QuotationItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum QuotationStatus {
        DRAFT,
        SENT,
        ACCEPTED,
        REJECTED,
        EXPIRED,
        CONVERTED
    }

    public void calculateTotal() {
        if (this.taxPercentage == null) this.taxPercentage = BigDecimal.ZERO;
        if (this.discount == null) this.discount = BigDecimal.ZERO;

        if (this.items == null || this.items.isEmpty()) {
            this.subtotal = BigDecimal.ZERO;
            this.taxAmount = BigDecimal.ZERO;
            this.total = BigDecimal.ZERO.subtract(this.discount);
            if (this.total.compareTo(BigDecimal.ZERO) < 0) this.total = BigDecimal.ZERO;
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
        
        this.taxAmount = subtotal.multiply(this.taxPercentage).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        this.total = subtotal.add(taxAmount).subtract(discount);
        if (this.total.compareTo(BigDecimal.ZERO) < 0) this.total = BigDecimal.ZERO;
    }
}
