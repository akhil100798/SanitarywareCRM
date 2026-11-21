package com.sanitaryware.crm.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class PortalRateLimiter {

    private final int maxRequests;
    private final long windowMillis;
    private final ConcurrentMap<String, RequestWindow> requests = new ConcurrentHashMap<>();

    public PortalRateLimiter(
            @Value("${security.portal-rate-limit.max-requests:60}") int maxRequests,
            @Value("${security.portal-rate-limit.window-ms:60000}") long windowMillis
    ) {
        if (maxRequests < 1 || windowMillis < 1) {
            throw new IllegalArgumentException("Portal rate-limit configuration must be positive");
        }
        this.maxRequests = maxRequests;
        this.windowMillis = windowMillis;
    }

    public void checkAllowed(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return;
        }
        evictExpired();
        long now = System.currentTimeMillis();
        requests.compute(clientIp, (key, existing) -> {
            if (existing == null || now - existing.startedAt() >= windowMillis) {
                return new RequestWindow(1, now);
            }
            if (existing.count() >= maxRequests) {
                throw new TooManyRequestsException();
            }
            return new RequestWindow(existing.count() + 1, existing.startedAt());
        });
    }

    @Scheduled(fixedDelayString = "${security.portal-rate-limit.cleanup-interval-ms:60000}")
    public void evictExpired() {
        long now = System.currentTimeMillis();
        requests.entrySet().removeIf(entry -> now - entry.getValue().startedAt() >= windowMillis);
    }

    public int getTrackedIpCount() {
        return requests.size();
    }

    public void reset(String clientIp) {
        if (clientIp != null) {
            requests.remove(clientIp);
        }
    }

    public void clear() {
        requests.clear();
    }

    private record RequestWindow(int count, long startedAt) {
    }
}
