package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.ProductPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductPriceHistoryRepository extends JpaRepository<ProductPriceHistory, Long> {
    List<ProductPriceHistory> findByCatalogVersionIdOrderBySkuAsc(Long catalogVersionId);
    List<ProductPriceHistory> findByProductIdOrderByCreatedAtDesc(Long productId);
}
