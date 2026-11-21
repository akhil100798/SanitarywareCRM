package com.sanitaryware.crm.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PortalRateLimiterTest {

    @Test
    @DisplayName("Allows requests within max limit, rejects beyond, and allows reset")
    void allowsWithinLimitAndRejectsBeyond() {
        PortalRateLimiter limiter = new PortalRateLimiter(3, 60000L);
        String ip = "192.168.1.100";

        assertDoesNotThrow(() -> limiter.checkAllowed(ip)); // 1
        assertDoesNotThrow(() -> limiter.checkAllowed(ip)); // 2
        assertDoesNotThrow(() -> limiter.checkAllowed(ip)); // 3
        assertThrows(TooManyRequestsException.class, () -> limiter.checkAllowed(ip)); // 4th rejected

        // Reset for that IP
        limiter.reset(ip);
        assertDoesNotThrow(() -> limiter.checkAllowed(ip));
    }

    @Test
    @DisplayName("Ignores null or blank IP addresses")
    void ignoresNullOrBlankIp() {
        PortalRateLimiter limiter = new PortalRateLimiter(2, 60000L);
        assertDoesNotThrow(() -> limiter.checkAllowed(null));
        assertDoesNotThrow(() -> limiter.checkAllowed("   "));
        assertEquals(0, limiter.getTrackedIpCount());
    }

    @Test
    @DisplayName("Expires window after windowMillis")
    void windowExpiresAfterDuration() throws InterruptedException {
        PortalRateLimiter limiter = new PortalRateLimiter(2, 50L);
        String ip = "10.0.0.1";

        assertDoesNotThrow(() -> limiter.checkAllowed(ip));
        assertDoesNotThrow(() -> limiter.checkAllowed(ip));
        assertThrows(TooManyRequestsException.class, () -> limiter.checkAllowed(ip));

        Thread.sleep(60L);
        assertDoesNotThrow(() -> limiter.checkAllowed(ip));
    }

    @Test
    @DisplayName("Evicts expired IP entries from tracking map")
    void evictsExpiredIpEntriesFromTrackingMap() throws InterruptedException {
        PortalRateLimiter limiter = new PortalRateLimiter(5, 50L);
        limiter.checkAllowed("192.168.1.10");
        limiter.checkAllowed("192.168.1.20");
        assertEquals(2, limiter.getTrackedIpCount());

        Thread.sleep(60L);

        // Explicit eviction cleans all expired entries
        limiter.evictExpired();
        assertEquals(0, limiter.getTrackedIpCount());

        // Opportunistic eviction during next checkAllowed call
        limiter.checkAllowed("192.168.1.30");
        assertEquals(1, limiter.getTrackedIpCount());

        Thread.sleep(60L);
        limiter.checkAllowed("192.168.1.40");
        // Old 192.168.1.30 was evicted, only 192.168.1.40 remains
        assertEquals(1, limiter.getTrackedIpCount());
    }
}
