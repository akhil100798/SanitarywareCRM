package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.ReminderLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReminderLogRepository extends JpaRepository<ReminderLog, Long> {

    @Query("SELECT r FROM ReminderLog r WHERE r.reminderType = :reminderType AND r.referenceId = :referenceId AND r.sentAt >= :since ORDER BY r.sentAt DESC")
    List<ReminderLog> findRecentReminders(@Param("reminderType") String reminderType,
                                          @Param("referenceId") Long referenceId,
                                          @Param("since") LocalDateTime since);

    Page<ReminderLog> findAllByOrderBySentAtDesc(Pageable pageable);

    List<ReminderLog> findTop50ByOrderBySentAtDesc();
}
