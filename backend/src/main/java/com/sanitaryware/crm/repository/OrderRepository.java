package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);
    interface StatusCount {
        Order.OrderStatus getStatus();
        Long getCount();
    }

    interface ProductSales {
        String getProductName();
        Long getQuantitySold();
        BigDecimal getTotalRevenue();
    }

    @Query("SELECT o.status AS status, COUNT(o) AS count FROM Order o GROUP BY o.status")
    List<StatusCount> countByStatus();

    @Query("SELECT COALESCE(SUM(o.balanceAmount), 0) FROM Order o")
    BigDecimal getTotalBalance();

    @Query("SELECT i.product.name AS productName, SUM(i.quantity) AS quantitySold, " +
           "SUM(i.lineTotal) AS totalRevenue FROM OrderItem i WHERE i.order.status <> :excludedStatus " +
           "GROUP BY i.product.name ORDER BY SUM(i.lineTotal) DESC, i.product.name ASC")
    List<ProductSales> findTopProductSales(@Param("excludedStatus") Order.OrderStatus excludedStatus, Pageable pageable);

    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByBillPadImageUrl(String billPadImageUrl);
    Page<Order> findByCreatedByUsername(String username, Pageable pageable);
    Page<Order> findByCustomerId(Long customerId, Pageable pageable);
    List<Order> findByCustomerId(Long customerId);
    List<Order> findByCustomerIdAndCreatedByUsername(Long customerId, String username);
    Page<Order> findByStatus(Order.OrderStatus status,Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.orderDate BETWEEN :startDate AND :endDate")
    List<Order> findOrdersBetweenDates(@Param("startDate") LocalDate startDate, 
                                       @Param("endDate") LocalDate endDate);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.orderDate = :date")
    Long countOrdersByDate(@Param("date") LocalDate date);
}
