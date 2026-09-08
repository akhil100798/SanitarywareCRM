package com.sanitaryware.crm.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class LoginRateLimiter {

    private final int maxAttempts;
    private final long windowMillis;
    private final ConcurrentMap<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    public LoginRateLimiter(
            @Value("${security.login-rate-limit.max-attempts:5}") int maxAttempts,
            @Value("${security.login-rate-limit.window-ms:900000}") long windowMillis
    ) {
        if (maxAttempts < 1 || windowMillis < 1) {
            throw new IllegalArgumentException("Login rate-limit configuration must be positive");
        }
        this.maxAttempts = maxAttempts;
        this.windowMillis = windowMillis;
    }

    public void checkAllowed(String key) {
        AttemptWindow window = attempts.get(key);
        if (window == null) return;
        if (isExpired(window)) {
            attempts.remove(key, window);
            return;
        }
        if (window.count >= maxAttempts) {
            throw new TooManyRequestsException();
        }
    }

    public void recordFailure(String key) {
        attempts.compute(key, (ignored, existing) -> {
            if (existing == null || isExpired(existing)) {
                return new AttemptWindow(1, System.currentTimeMillis());
            }
            return new AttemptWindow(existing.count + 1, existing.startedAt);
        });
    }

    public void reset(String key) {
        attempts.remove(key);
    }

    private boolean isExpired(AttemptWindow window) {
        return System.currentTimeMillis() - window.startedAt >= windowMillis;
    }

    private record AttemptWindow(int count, long startedAt) {
    }
}
