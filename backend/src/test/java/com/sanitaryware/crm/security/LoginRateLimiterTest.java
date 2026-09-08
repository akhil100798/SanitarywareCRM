package com.sanitaryware.crm.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginRateLimiterTest {

    @Test
    void blocksTheNextAttemptAfterConfiguredFailuresAndAllowsReset() {
        LoginRateLimiter limiter = new LoginRateLimiter(5, 15 * 60 * 1000L);
        String key = "127.0.0.1:sales";

        for (int attempt = 0; attempt < 5; attempt++) {
            limiter.recordFailure(key);
        }

        assertThrows(TooManyRequestsException.class, () -> limiter.checkAllowed(key));
        limiter.reset(key);
        assertDoesNotThrow(() -> limiter.checkAllowed(key));
    }
}
