package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    java.util.Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.order.id = :orderId order by p.id")
    List<Payment> findForOrderForUpdate(@Param("orderId") Long orderId);

    @Query("select p.order.id from Payment p where p.id = :id")
    java.util.Optional<Long> findOrderIdById(@Param("id") Long id);

    java.util.Optional<Payment> findByPaymentNumber(String paymentNumber);
    List<Payment> findByOrderId(Long orderId);
    List<Payment> findByOrderCreatedByUsername(String username);
    
    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.paymentDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalPaymentsBetweenDates(@Param("startDate") LocalDate startDate, 
                                            @Param("endDate") LocalDate endDate);
}
