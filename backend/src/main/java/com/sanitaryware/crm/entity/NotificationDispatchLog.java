package com.sanitaryware.crm.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_dispatch_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDispatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "channel", nullable = false, length = 50)
    private String channel; // EMAIL, WHATSAPP, IN_APP

    @Column(name = "recipient", nullable = false, length = 255)
    private String recipient;

    @Column(name = "subject", length = 255)
    private String subject;

    @Column(name = "message_content", columnDefinition = "TEXT")
    private String messageContent;

    @Column(name = "notification_type", nullable = false, length = 100)
    private String notificationType; // PAYMENT_DUE, LOW_STOCK, ORDER_CONFIRMATION, QUOTATION_SHARE, SYSTEM_ALERT

    @Column(name = "delivery_status", nullable = false, length = 50)
    private String deliveryStatus; // SENT, SIMULATED, FAILED

    @Column(name = "error_detail", columnDefinition = "TEXT")
    private String errorDetail;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.retryCount == null) {
            this.retryCount = 0;
        }
        if (this.sentAt == null && ("SENT".equalsIgnoreCase(deliveryStatus) || "SIMULATED".equalsIgnoreCase(deliveryStatus))) {
            this.sentAt = LocalDateTime.now();
        }
    }
}
