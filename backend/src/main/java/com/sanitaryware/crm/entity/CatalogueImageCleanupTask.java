package com.sanitaryware.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "catalogue_image_cleanup_tasks", uniqueConstraints = @UniqueConstraint(
        name = "uk_catalogue_image_cleanup_batch_url", columnNames = {"batch_id", "image_url"}))
@Getter
@Setter
@NoArgsConstructor
public class CatalogueImageCleanupTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, length = 64)
    private String batchId;

    @Column(name = "image_url", nullable = false, length = 255)
    private String imageUrl;
}
