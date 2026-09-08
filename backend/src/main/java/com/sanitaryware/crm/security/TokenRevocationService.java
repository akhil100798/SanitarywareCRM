package com.sanitaryware.crm.security;

import io.jsonwebtoken.Claims;
import com.sanitaryware.crm.entity.RevokedToken;
import com.sanitaryware.crm.repository.RevokedTokenRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class TokenRevocationService {

    private final JwtTokenProvider jwtTokenProvider;
    private final RevokedTokenRepository revokedTokenRepository;

    public TokenRevocationService(JwtTokenProvider jwtTokenProvider, RevokedTokenRepository revokedTokenRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.revokedTokenRepository = revokedTokenRepository;
    }

    @Transactional
    public void revoke(String token) {
        Claims claims = jwtTokenProvider.extractClaim(token, claimSet -> claimSet);
        LocalDateTime expiresAt = LocalDateTime.ofInstant(
                claims.getExpiration().toInstant(), ZoneOffset.UTC);
        if (expiresAt.isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
            revokedTokenRepository.save(new RevokedToken(tokenFingerprint(token), expiresAt));
        }
    }

    @Transactional(readOnly = true)
    public boolean isRevoked(String token) {
        return revokedTokenRepository.existsByTokenFingerprintAndExpiresAtAfter(
                tokenFingerprint(token), LocalDateTime.now(ZoneOffset.UTC));
    }

    @Scheduled(fixedDelayString = "${security.token-revocation.cleanup-interval-ms:3600000}")
    @Transactional
    public void purgeExpiredTokens() {
        revokedTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now(ZoneOffset.UTC));
    }

    private String tokenFingerprint(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder fingerprint = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                fingerprint.append(String.format("%02x", value));
            }
            return fingerprint.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }
}
