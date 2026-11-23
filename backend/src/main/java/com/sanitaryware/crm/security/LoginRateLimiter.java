package com.sanitaryware.crm.security;

import com.sanitaryware.crm.security.ratelimit.InMemoryRateLimiterStore;
import com.sanitaryware.crm.security.ratelimit.RateLimiterStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LoginRateLimiter {

    private final int maxAttempts;
    private final long windowMillis;
    private final RateLimiterStore store;

    @Autowired
    public LoginRateLimiter(
            @Value("${security.login-rate-limit.max-attempts:5}") int maxAttempts,
            @Value("${security.login-rate-limit.window-ms:900000}") long windowMillis,
            RateLimiterStore store
    ) {
        if (maxAttempts < 1 || windowMillis < 1) {
            throw new IllegalArgumentException("Login rate-limit configuration must be positive");
        }
        this.maxAttempts = maxAttempts;
        this.windowMillis = windowMillis;
        this.store = store;
    }

    public LoginRateLimiter(int maxAttempts, long windowMillis) {
        this(maxAttempts, windowMillis, new InMemoryRateLimiterStore());
    }

    public void checkAllowed(String key) {
        if (store.isBlocked(key, maxAttempts, windowMillis)) {
            throw new TooManyRequestsException();
        }
    }

    public void recordFailure(String key) {
        store.recordAttempt(key, windowMillis);
    }

    public void reset(String key) {
        store.reset(key);
    }
}
