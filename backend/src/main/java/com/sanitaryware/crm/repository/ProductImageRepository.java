package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductIdOrderByDisplayOrderAsc(Long productId);
    Optional<ProductImage> findByIdAndProductId(Long id, Long productId);
    Optional<ProductImage> findByImageUrl(String imageUrl);
}
