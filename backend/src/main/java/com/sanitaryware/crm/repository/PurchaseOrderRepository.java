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
    Optional<PurchaseOrder> findByPoNumber(String poNumber);
    Page<PurchaseOrder> findByStatus(PurchaseOrder.POStatus status, Pageable pageable);
    List<PurchaseOrder> findByDistributorId(Long distributorId);

    @Query("SELECT COALESCE(SUM(po.total), 0) FROM PurchaseOrder po WHERE po.orderDate BETWEEN :start AND :end")
    BigDecimal getTotalPurchasesBetweenDates(LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(po.balanceAmount), 0) FROM PurchaseOrder po WHERE po.balanceAmount > 0")
    BigDecimal getTotalOutstandingPayables();

    long countByStatus(PurchaseOrder.POStatus status);
}
