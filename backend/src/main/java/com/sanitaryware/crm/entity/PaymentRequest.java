package com.sanitaryware.crm.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_requests", uniqueConstraints = @UniqueConstraint(
        name = "uk_payment_request", columnNames = {"actor_id", "operation", "key_hash"}))
@Getter @Setter @NoArgsConstructor
public class PaymentRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long actorId;
    @Column(nullable = false, length = 32) private String operation;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.CHAR)
    @Column(nullable = false, length = 64) private String keyHash;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.CHAR)
    @Column(nullable = false, length = 64) private String requestHash;
    @Column(nullable = false) private Long paymentId;
    @Column(nullable = false, columnDefinition = "LONGTEXT") private String responseJson;
    @CreationTimestamp @Column(nullable = false, updatable = false) private LocalDateTime createdAt;
}
