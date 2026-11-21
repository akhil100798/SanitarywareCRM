package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.CatalogVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CatalogVersionRepository extends JpaRepository<CatalogVersion, Long> {
    List<CatalogVersion> findByBrandIdOrderByCreatedAtDesc(Long brandId);
}
