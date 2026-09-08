package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface RevokedTokenRepository extends JpaRepository<RevokedToken, String> {

    boolean existsByTokenFingerprintAndExpiresAtAfter(String tokenFingerprint, LocalDateTime now);

    long deleteByExpiresAtBefore(LocalDateTime now);
}
