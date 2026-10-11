package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT po FROM PurchaseOrder po WHERE po.id = :id")
    Optional<PurchaseOrder> findByIdForUpdate(@Param("id") Long id);
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
}
