package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderNumber(String orderNumber);
    Page<Order> findByCustomerId(Long customerId, Pageable pageable);
    List<Order> findByCustomerId(Long customerId);
    Page<Order> findByStatus(Order.OrderStatus status,Pageable pageable);
    Page<Order> findByPaymentStatus(Order.PaymentStatus paymentStatus, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.orderDate BETWEEN :startDate AND :endDate")
    List<Order> findOrdersBetweenDates(@Param("startDate") LocalDate startDate, 
                                       @Param("endDate") LocalDate endDate);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.orderDate = :date")
    Long countOrdersByDate(@Param("date") LocalDate date);
}
