package com.sanitaryware.crm.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal lineTotal;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    @PreUpdate
    public void calculateLineTotal() {
        if (this.unitPrice == null) this.unitPrice = BigDecimal.ZERO;
        if (this.quantity == null) this.quantity = 0;
        if (this.product != null && this.product.getMrp() != null && this.product.getMrp().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal mrp = this.product.getMrp();
            if (this.unitPrice.compareTo(mrp) <= 0) {
                this.discountPercentage = mrp.subtract(this.unitPrice)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(mrp, 2, java.math.RoundingMode.HALF_UP);
            } else {
                this.discountPercentage = BigDecimal.ZERO;
            }
        } else if (this.discountPercentage == null) {
            this.discountPercentage = BigDecimal.ZERO;
        }

        this.lineTotal = this.unitPrice.multiply(BigDecimal.valueOf(this.quantity));
    }
}
