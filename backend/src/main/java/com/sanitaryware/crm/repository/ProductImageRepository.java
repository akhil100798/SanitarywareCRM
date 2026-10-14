package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductIdOrderByDisplayOrderAsc(Long productId);
    List<ProductImage> findByCatalogueImportBatchId(String catalogueImportBatchId);
    Optional<ProductImage> findByIdAndProductId(Long id, Long productId);
    Optional<ProductImage> findByImageUrl(String imageUrl);
    @org.springframework.transaction.annotation.Transactional(readOnly = true,
            propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    boolean existsByImageUrl(String imageUrl);

    @Query("select case when count(i) > 0 then true else false end from ProductImage i where i.imageUrl = :imageUrl")
    boolean existsImageReferenceInCurrentTransaction(@Param("imageUrl") String imageUrl);
}
