package com.sanitaryware.crm.security.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConditionalOnProperty(name = "security.rate-limiter.store", havingValue = "redis")
public class RedisRateLimiterStore implements RateLimiterStore {

    private static final Logger log = LoggerFactory.getLogger(RedisRateLimiterStore.class);
    private static final String PORTAL_PREFIX = "ratelimit:portal:";
    private static final String LOGIN_PREFIX = "ratelimit:login:";

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimiterStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean tryAcquire(String key, int maxRequests, long windowMillis) {
        if (key == null || key.isBlank()) {
            return true;
        }
        String redisKey = PORTAL_PREFIX + key;
        try {
            Long count = redisTemplate.opsForValue().increment(redisKey);
            if (count != null && count == 1L) {
                redisTemplate.expire(redisKey, Duration.ofMillis(windowMillis));
            }
            return count != null && count <= maxRequests;
        } catch (Exception e) {
            log.warn("Redis rate-limiting unavailable for key: {}, failing open: {}", key, e.getMessage());
            return true;
        }
    }

    @Override
    public int recordAttempt(String key, long windowMillis) {
        if (key == null || key.isBlank()) {
            return 0;
        }
        String redisKey = LOGIN_PREFIX + key;
        try {
            Long count = redisTemplate.opsForValue().increment(redisKey);
            if (count != null && count == 1L) {
                redisTemplate.expire(redisKey, Duration.ofMillis(windowMillis));
            }
            return count != null ? count.intValue() : 0;
        } catch (Exception e) {
            log.warn("Redis failure recording attempt for key: {}, failing open: {}", key, e.getMessage());
            return 0;
        }
    }

    @Override
    public boolean isBlocked(String key, int maxAttempts, long windowMillis) {
        if (key == null || key.isBlank()) {
            return false;
        }
        String redisKey = LOGIN_PREFIX + key;
        try {
            String val = redisTemplate.opsForValue().get(redisKey);
            if (val == null) {
                return false;
            }
            return Integer.parseInt(val) >= maxAttempts;
        } catch (Exception e) {
            log.warn("Redis failure checking block state for key: {}, failing open: {}", key, e.getMessage());
            return false;
        }
    }

    @Override
    public void reset(String key) {
        if (key == null) return;
        try {
            redisTemplate.delete(PORTAL_PREFIX + key);
            redisTemplate.delete(LOGIN_PREFIX + key);
        } catch (Exception e) {
            log.warn("Redis failure resetting key: {}", key, e);
        }
    }

    @Override
    public void clear() {
        // In Redis, keys expire automatically via TTL
    }

    @Override
    public void evictExpired() {
        // Managed natively by Redis key TTL expiration
    }

    @Override
    public int getTrackedKeyCount() {
        return 0;
    }
}
