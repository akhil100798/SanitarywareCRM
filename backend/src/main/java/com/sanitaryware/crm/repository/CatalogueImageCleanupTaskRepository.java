package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.CatalogueImageCleanupTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CatalogueImageCleanupTaskRepository extends JpaRepository<CatalogueImageCleanupTask, Long> {
    List<CatalogueImageCleanupTask> findByBatchId(String batchId);
    boolean existsByBatchIdAndImageUrl(String batchId, String imageUrl);
}
