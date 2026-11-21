package com.sanitaryware.crm.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "catalog_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CatalogVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = false)
    private Brand brand;

    @Column(nullable = false, length = 100)
    private String versionTag;

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false)
    private Integer totalProducts;

    @Column(nullable = false)
    private Integer createdCount;

    @Column(nullable = false)
    private Integer updatedCount;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, ROLLED_BACK

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(length = 100)
    private String createdBy;

    @OneToMany(mappedBy = "catalogVersion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProductPriceHistory> priceHistories = new ArrayList<>();
}
