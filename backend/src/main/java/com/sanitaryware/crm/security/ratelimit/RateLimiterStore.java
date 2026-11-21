package com.sanitaryware.crm.security.ratelimit;

public interface RateLimiterStore {

    /**
     * Attempts to acquire a single permit in the active window.
     *
     * @param key unique identifier (e.g. client IP or username)
     * @param maxRequests maximum allowed requests per window
     * @param windowMillis duration of the rate limit window in milliseconds
     * @return true if permitted, false if rate limit has been exceeded
     */
    boolean tryAcquire(String key, int maxRequests, long windowMillis);

    /**
     * Records a failure or attempt against a key.
     *
     * @param key unique identifier
     * @param windowMillis duration of the window in milliseconds
     * @return total attempts within the current window
     */
    int recordAttempt(String key, long windowMillis);

    /**
     * Checks if current attempt count has exceeded the maximum attempts.
     *
     * @param key unique identifier
     * @param maxAttempts maximum allowed attempts
     * @param windowMillis duration of the window in milliseconds
     * @return true if currently blocked, false otherwise
     */
    boolean isBlocked(String key, int maxAttempts, long windowMillis);

    /**
     * Resets rate limiting state for a specific key.
     *
     * @param key unique identifier
     */
    void reset(String key);

    /**
     * Clears all tracking state.
     */
    void clear();

    /**
     * Evicts expired tracking entries from storage.
     */
    void evictExpired();

    /**
     * Returns total tracked keys (for metrics and test verification).
     */
    int getTrackedKeyCount();
}
