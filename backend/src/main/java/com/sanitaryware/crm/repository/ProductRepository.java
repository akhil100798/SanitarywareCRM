package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
    
    @Query("SELECT p FROM Product p WHERE " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Product> searchProducts(@Param("search") String search, Pageable pageable);
    
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);
    Page<Product> findByBrandId(Long brandId, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.stockQuantity <= p.reorderLevel")
    List<Product> findLowStockProducts();
    
    List<Product> findByIsActiveTrueAndIsFeaturedTrue();
    
    Page<Product> findByIsActiveTrue(Pageable pageable);
}
