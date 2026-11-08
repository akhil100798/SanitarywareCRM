package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.BootstrapLock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface BootstrapLockRepository extends JpaRepository<BootstrapLock, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select bootstrapLock from BootstrapLock bootstrapLock where bootstrapLock.id = 1")
    Optional<BootstrapLock> findSingletonForUpdate();
}
