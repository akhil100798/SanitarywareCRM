package com.sanitaryware.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "revoked_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevokedToken {

    @Id
    @Column(name = "token_fingerprint", nullable = false, length = 64, updatable = false)
    private String tokenFingerprint;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
