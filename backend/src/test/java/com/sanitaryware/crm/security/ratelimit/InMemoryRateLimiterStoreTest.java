package com.sanitaryware.crm.security.ratelimit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InMemoryRateLimiterStoreTest {

    @Test
    @DisplayName("Permits requests up to max and blocks thereafter")
    void permitsUpToMaxAndBlocks() {
        InMemoryRateLimiterStore store = new InMemoryRateLimiterStore();
        String ip = "10.0.0.1";

        assertTrue(store.tryAcquire(ip, 2, 60000L));
        assertTrue(store.tryAcquire(ip, 2, 60000L));
        assertFalse(store.tryAcquire(ip, 2, 60000L));

        store.reset(ip);
        assertTrue(store.tryAcquire(ip, 2, 60000L));
    }

    @Test
    @DisplayName("Tracks login attempt counts and detects blocks")
    void tracksLoginAttemptsAndBlocks() {
        InMemoryRateLimiterStore store = new InMemoryRateLimiterStore();
        String userKey = "user:admin";

        assertFalse(store.isBlocked(userKey, 3, 60000L));
        assertEquals(1, store.recordAttempt(userKey, 60000L));
        assertEquals(2, store.recordAttempt(userKey, 60000L));
        assertFalse(store.isBlocked(userKey, 3, 60000L));

        assertEquals(3, store.recordAttempt(userKey, 60000L));
        assertTrue(store.isBlocked(userKey, 3, 60000L));

        store.reset(userKey);
        assertFalse(store.isBlocked(userKey, 3, 60000L));
    }

    @Test
    @DisplayName("Evicts expired keys")
    void evictsExpiredKeys() throws InterruptedException {
        InMemoryRateLimiterStore store = new InMemoryRateLimiterStore();
        store.tryAcquire("temp-ip-1", 5, 50L);
        store.recordAttempt("temp-user-1", 50L);
        assertEquals(2, store.getTrackedKeyCount());

        Thread.sleep(60L);
        store.evictExpired();
        assertEquals(0, store.getTrackedKeyCount());
    }
}
