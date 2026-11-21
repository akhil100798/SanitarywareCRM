package com.sanitaryware.crm.security.ratelimit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisRateLimiterStoreTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private RedisRateLimiterStore redisStore;

    @Test
    @DisplayName("Increments counter and sets TTL on first hit")
    void incrementsAndSetsTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("ratelimit:portal:1.2.3.4")).thenReturn(1L);

        boolean allowed = redisStore.tryAcquire("1.2.3.4", 5, 60000L);

        assertTrue(allowed);
        verify(redisTemplate).expire(eq("ratelimit:portal:1.2.3.4"), any(Duration.class));
    }

    @Test
    @DisplayName("Returns false when request count exceeds max")
    void rejectsWhenExceedingMax() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("ratelimit:portal:1.2.3.4")).thenReturn(6L);

        boolean allowed = redisStore.tryAcquire("1.2.3.4", 5, 60000L);

        assertFalse(allowed);
    }

    @Test
    @DisplayName("Fails open gracefully when Redis throws an exception")
    void failsOpenOnRedisException() {
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis connection refused"));

        boolean allowed = redisStore.tryAcquire("1.2.3.4", 5, 60000L);

        assertTrue(allowed);
    }
}
