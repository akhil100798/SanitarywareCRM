package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PurchaseOrder p where p.id = :id")
    Optional<PurchaseOrder> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    @Query("select p.distributor.id from PurchaseOrder p where p.id = :id")
    Optional<Long> findDistributorIdById(@org.springframework.data.repository.query.Param("id") Long id);

    @Query("SELECT COALESCE(SUM(po.balanceAmount), 0) FROM PurchaseOrder po")
    BigDecimal getTotalBalance();

    Optional<PurchaseOrder> findByPoNumber(String poNumber);
    Optional<PurchaseOrder> findByInvoicePdfPath(String invoicePdfPath);
    Page<PurchaseOrder> findByStatus(PurchaseOrder.POStatus status, Pageable pageable);
    List<PurchaseOrder> findByDistributorId(Long distributorId);

    @Query("SELECT COALESCE(SUM(po.total), 0) FROM PurchaseOrder po WHERE po.orderDate BETWEEN :start AND :end")
    BigDecimal getTotalPurchasesBetweenDates(LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(po.balanceAmount), 0) FROM PurchaseOrder po WHERE po.balanceAmount > 0")
    BigDecimal getTotalOutstandingPayables();

    long countByStatus(PurchaseOrder.POStatus status);

    interface DistributorSupplierInfo {
        Long getDistributorId();
        String getDistributorName();
    }

    @Query("SELECT poi.purchaseOrder.distributor.id AS distributorId, poi.purchaseOrder.distributor.name AS distributorName " +
           "FROM PurchaseOrderItem poi WHERE poi.product.id = :productId ORDER BY poi.purchaseOrder.orderDate DESC")
    List<DistributorSupplierInfo> findRecentSuppliersForProduct(@org.springframework.data.repository.query.Param("productId") Long productId, Pageable pageable);
}
