package com.sanitaryware.crm.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_price_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductPriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalog_version_id", nullable = false)
    private CatalogVersion catalogVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(precision = 10, scale = 2)
    private BigDecimal oldMrp;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal newMrp;

    @Column(precision = 10, scale = 2)
    private BigDecimal oldSellingPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal newSellingPrice;

    @Column(nullable = false, length = 20)
    private String changeType; // CREATED, UPDATED, UNCHANGED

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
