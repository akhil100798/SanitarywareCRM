package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.Quotation;
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
public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    Optional<Quotation> findByQuotationNumber(String quotationNumber);
    Page<Quotation> findByCustomerId(Long customerId, Pageable pageable);
    List<Quotation> findByCustomerId(Long customerId);
    Page<Quotation> findByStatus(Quotation.QuotationStatus status, Pageable pageable);
    
    @Query("SELECT q FROM Quotation q WHERE q.validUntil < :today AND q.status = 'SENT'")
    List<Quotation> findExpiredQuotations(@Param("today") LocalDate today);
    
    @Query("SELECT COUNT(q) FROM Quotation q WHERE q.quotationDate = :date")
    Long countQuotationsByDate(@Param("date") LocalDate date);
}
