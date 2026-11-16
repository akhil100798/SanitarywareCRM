package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.PaymentRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import java.util.Optional;

public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PaymentRequest> findByActorIdAndOperationAndKeyHash(Long actorId, String operation, String keyHash);
}
