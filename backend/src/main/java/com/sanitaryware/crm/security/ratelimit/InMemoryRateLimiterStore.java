package com.sanitaryware.crm.security.ratelimit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@ConditionalOnProperty(name = "security.rate-limiter.store", havingValue = "memory", matchIfMissing = true)
public class InMemoryRateLimiterStore implements RateLimiterStore {

    private final ConcurrentMap<String, RequestWindow> requests = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    @Override
    public boolean tryAcquire(String key, int maxRequests, long windowMillis) {
        if (key == null || key.isBlank()) {
            return true;
        }
        long now = System.currentTimeMillis();
        AtomicBoolean permitted = new AtomicBoolean(false);

        requests.compute(key, (k, existing) -> {
            if (existing == null || now - existing.startedAt() >= windowMillis) {
                permitted.set(true);
                return new RequestWindow(1, now, windowMillis);
            }
            if (existing.count() >= maxRequests) {
                permitted.set(false);
                return existing;
            }
            permitted.set(true);
            return new RequestWindow(existing.count() + 1, existing.startedAt(), windowMillis);
        });

        return permitted.get();
    }

    @Override
    public int recordAttempt(String key, long windowMillis) {
        if (key == null || key.isBlank()) {
            return 0;
        }
        long now = System.currentTimeMillis();
        AttemptWindow window = attempts.compute(key, (k, existing) -> {
            if (existing == null || now - existing.startedAt() >= windowMillis) {
                return new AttemptWindow(1, now, windowMillis);
            }
            return new AttemptWindow(existing.count() + 1, existing.startedAt(), windowMillis);
        });
        return window.count();
    }

    @Override
    public boolean isBlocked(String key, int maxAttempts, long windowMillis) {
        if (key == null || key.isBlank()) {
            return false;
        }
        AttemptWindow window = attempts.get(key);
        if (window == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        if (now - window.startedAt() >= windowMillis) {
            attempts.remove(key, window);
            return false;
        }
        return window.count() >= maxAttempts;
    }

    @Override
    public void reset(String key) {
        if (key != null) {
            requests.remove(key);
            attempts.remove(key);
        }
    }

    @Override
    public void clear() {
        requests.clear();
        attempts.clear();
    }

    @Override
    public void evictExpired() {
        long now = System.currentTimeMillis();
        requests.entrySet().removeIf(entry -> now - entry.getValue().startedAt() >= entry.getValue().windowMillis());
        attempts.entrySet().removeIf(entry -> now - entry.getValue().startedAt() >= entry.getValue().windowMillis());
    }

    @Override
    public int getTrackedKeyCount() {
        return requests.size() + attempts.size();
    }

    private record RequestWindow(int count, long startedAt, long windowMillis) {}
    private record AttemptWindow(int count, long startedAt, long windowMillis) {}
}
