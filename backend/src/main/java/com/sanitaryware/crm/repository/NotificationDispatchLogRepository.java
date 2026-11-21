package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.NotificationDispatchLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationDispatchLogRepository extends JpaRepository<NotificationDispatchLog, Long> {

    Page<NotificationDispatchLog> findByDeliveryStatus(String deliveryStatus, Pageable pageable);

    Page<NotificationDispatchLog> findByChannel(String channel, Pageable pageable);

    Page<NotificationDispatchLog> findByNotificationType(String notificationType, Pageable pageable);

    @Query("SELECT n FROM NotificationDispatchLog n WHERE " +
           "(:channel IS NULL OR n.channel = :channel) AND " +
           "(:deliveryStatus IS NULL OR n.deliveryStatus = :deliveryStatus) AND " +
           "(:notificationType IS NULL OR n.notificationType = :notificationType) AND " +
           "(:searchTerm IS NULL OR LOWER(n.recipient) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(n.subject) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<NotificationDispatchLog> searchLogs(
            @Param("channel") String channel,
            @Param("deliveryStatus") String deliveryStatus,
            @Param("notificationType") String notificationType,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );

    List<NotificationDispatchLog> findTop20ByDeliveryStatusOrderByCreatedAtDesc(String deliveryStatus);
}
