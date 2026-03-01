package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.Distributor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DistributorRepository extends JpaRepository<Distributor, Long> {
    Page<Distributor> findByIsActiveTrue(Pageable pageable);
    List<Distributor> findByIsActiveTrue();

    @Query("SELECT d FROM Distributor d WHERE LOWER(d.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(d.contactPerson) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(d.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Distributor> searchDistributors(String search, Pageable pageable);
}
