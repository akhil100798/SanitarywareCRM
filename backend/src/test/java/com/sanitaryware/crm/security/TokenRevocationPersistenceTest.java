package com.sanitaryware.crm.security;

import com.sanitaryware.crm.entity.RevokedToken;
import com.sanitaryware.crm.repository.RevokedTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.context.transaction.TestTransaction;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
}, showSql = false)
class TokenRevocationPersistenceTest {

    @Autowired
    private RevokedTokenRepository revokedTokenRepository;

    @Test
    void revocationPersistsAcrossIndependentServiceInstancesAndExpiredRecordsArePurged() {
        JwtTokenProvider tokenProvider = tokenProvider();
        TokenRevocationService nodeA = new TokenRevocationService(tokenProvider, revokedTokenRepository);
        TokenRevocationService nodeB = new TokenRevocationService(tokenProvider, revokedTokenRepository);
        String token = tokenProvider.generateToken("sales", "SALES");

        nodeA.revoke(token);
        TestTransaction.flagForCommit();
        TestTransaction.end();
        TestTransaction.start();

        assertTrue(nodeB.isRevoked(token));

        revokedTokenRepository.save(new RevokedToken("a".repeat(64), LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1)));
        nodeB.purgeExpiredTokens();

        assertFalse(revokedTokenRepository.existsById("a".repeat(64)));
    }

    private JwtTokenProvider tokenProvider() {
        JwtTokenProvider tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "secret", "persistence-test-secret-with-at-least-32-characters");
        ReflectionTestUtils.setField(tokenProvider, "expiration", 60000L);
        tokenProvider.validateConfiguration();
        return tokenProvider;
    }
}
