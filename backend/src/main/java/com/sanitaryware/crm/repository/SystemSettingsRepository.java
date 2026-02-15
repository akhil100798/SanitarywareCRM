package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.SystemSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemSettingsRepository extends JpaRepository<SystemSettings, Long> {
    // Usually there is only one row, so we can just use findFirst or findAll
    SystemSettings findTopByOrderByIdAsc();
}
