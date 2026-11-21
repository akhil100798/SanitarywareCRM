package com.sanitaryware.crm.security;

import com.sanitaryware.crm.security.ratelimit.InMemoryRateLimiterStore;
import com.sanitaryware.crm.security.ratelimit.RateLimiterStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class PortalRateLimiter {

    private final int maxRequests;
    private final long windowMillis;
    private final RateLimiterStore store;

    @Autowired
    public PortalRateLimiter(
            @Value("${security.portal-rate-limit.max-requests:60}") int maxRequests,
            @Value("${security.portal-rate-limit.window-ms:60000}") long windowMillis,
            RateLimiterStore store
    ) {
        if (maxRequests < 1 || windowMillis < 1) {
            throw new IllegalArgumentException("Portal rate-limit configuration must be positive");
        }
        this.maxRequests = maxRequests;
        this.windowMillis = windowMillis;
        this.store = store;
    }

    public PortalRateLimiter(int maxRequests, long windowMillis) {
        this(maxRequests, windowMillis, new InMemoryRateLimiterStore());
    }

    public void checkAllowed(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return;
        }
        evictExpired();
        if (!store.tryAcquire(clientIp, maxRequests, windowMillis)) {
            throw new TooManyRequestsException();
        }
    }

    @Scheduled(fixedDelayString = "${security.portal-rate-limit.cleanup-interval-ms:60000}")
    public void evictExpired() {
        store.evictExpired();
    }

    public int getTrackedIpCount() {
        return store.getTrackedKeyCount();
    }

    public void reset(String clientIp) {
        if (clientIp != null) {
            store.reset(clientIp);
        }
    }

    public void clear() {
        store.clear();
    }
}
