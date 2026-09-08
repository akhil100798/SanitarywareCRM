package com.sanitaryware.crm.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.sanitaryware.crm.entity.RevokedToken;
import com.sanitaryware.crm.repository.RevokedTokenRepository;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TokenRevocationServiceTest {

    @Mock
    private RevokedTokenRepository revokedTokenRepository;

    @Test
    void revocationStoresOnlyFingerprintAndChecksItUntilExpiry() {
        JwtTokenProvider tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "secret", "unit-test-secret-with-at-least-32-characters");
        ReflectionTestUtils.setField(tokenProvider, "expiration", 60000L);
        tokenProvider.validateConfiguration();
        TokenRevocationService service = new TokenRevocationService(tokenProvider, revokedTokenRepository);
        String token = tokenProvider.generateToken("sales", "SALES");
        String secondSession = tokenProvider.generateToken("sales", "SALES");
        org.junit.jupiter.api.Assertions.assertNotEquals(token, secondSession,
                "Independent logins must not share a revocation fingerprint");

        when(revokedTokenRepository.existsByTokenFingerprintAndExpiresAtAfter(anyString(), any(LocalDateTime.class)))
                .thenReturn(false, true);
        assertFalse(service.isRevoked(token));
        service.revoke(token);
        assertTrue(service.isRevoked(token));

        org.mockito.ArgumentCaptor<RevokedToken> tokenCaptor =
                org.mockito.ArgumentCaptor.forClass(RevokedToken.class);
        verify(revokedTokenRepository).save(tokenCaptor.capture());
        assertFalse(tokenCaptor.getValue().getTokenFingerprint().contains(token));
        assertTrue(tokenCaptor.getValue().getTokenFingerprint().matches("[a-f0-9]{64}"));
        assertTrue(tokenCaptor.getValue().getExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC)));
    }
}
