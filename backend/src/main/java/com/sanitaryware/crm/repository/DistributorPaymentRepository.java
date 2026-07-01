package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.DistributorPayment;
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
public interface DistributorPaymentRepository extends JpaRepository<DistributorPayment, Long> {
    Optional<DistributorPayment> findByPaymentNumber(String paymentNumber);
    List<DistributorPayment> findByPurchaseOrderId(Long purchaseOrderId);
    Page<DistributorPayment> findAll(Pageable pageable);

    @Query("SELECT COALESCE(SUM(dp.amount), 0) FROM DistributorPayment dp WHERE dp.paymentDate BETWEEN :start AND :end")
    BigDecimal getTotalDistributorPaymentsBetweenDates(LocalDate start, LocalDate end);
}
