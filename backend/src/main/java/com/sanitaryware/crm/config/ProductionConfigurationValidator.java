package com.sanitaryware.crm.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Validates critical production configuration at startup when running under the 'prod' profile.
 * Prevents application launch if default passwords, placeholder JWT secrets, or insecure CORS
 * configurations are supplied.
 */
@Slf4j
@Component
@Profile("prod")
public class ProductionConfigurationValidator {

    private static final Set<String> INSECURE_PASSWORDS = Set.of(
            "password", "root", "admin", "123456", "1607", "crm_password", "replace_with_secure_password"
    );

    private static final Set<String> INSECURE_JWT_SECRETS = Set.of(
            "local-only-change-me-please-change-this-secret-123456",
            "replace_with_very_long_secure_random_secret_min_32_chars",
            "your_jwt_secret_key_here_must_be_at_least_256_bits_long_for_hs256",
            "12345678901234567890123456789012"
    );

    @Value("${spring.datasource.password}")
    private String databasePassword;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${app.cors.allowed-origin-patterns}")
    private String corsAllowedOrigins;

    @Value("${spring.datasource.url}")
    private String databaseUrl;

    @PostConstruct
    public void validate() {
        validateDatabasePassword(databasePassword);
        validateJwtSecret(jwtSecret);
        validateCorsOrigins(corsAllowedOrigins);
        validateDatabaseUrl(databaseUrl);
        log.info("Production security configuration validated successfully.");
    }

    public static void validateDatabasePassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalStateException("Production DATABASE_PASSWORD must be configured and non-empty.");
        }
        String normalized = password.trim().toLowerCase();
        if (INSECURE_PASSWORDS.contains(normalized)
                || normalized.contains("replace_with")
                || normalized.contains("placeholder")
                || normalized.contains("changeme")
                || normalized.contains("change-me")) {
            throw new IllegalStateException("Production DATABASE_PASSWORD cannot use default or placeholder credentials: " + password);
        }
        if (password.length() < 8) {
            throw new IllegalStateException("Production DATABASE_PASSWORD must be at least 8 characters long.");
        }
    }

    public static void validateJwtSecret(String secret) {
        if (secret == null || secret.trim().length() < 32) {
            throw new IllegalStateException("Production JWT_SECRET must be at least 32 characters (256 bits).");
        }
        String normalized = secret.trim().toLowerCase();
        if (INSECURE_JWT_SECRETS.contains(normalized)
                || normalized.contains("replace_with")
                || normalized.contains("placeholder")
                || normalized.contains("changeme")
                || normalized.contains("change-me")
                || normalized.contains("local-only-change-me")
                || normalized.contains("secret_key_here")) {
            throw new IllegalStateException("Production JWT_SECRET cannot use default or placeholder keys.");
        }
    }

    public static void validateCorsOrigins(String origins) {
        if (origins == null || origins.trim().isEmpty()) {
            throw new IllegalStateException("Production CORS_ALLOWED_ORIGIN_PATTERNS must be configured.");
        }
        if (origins.trim().equals("*")) {
            throw new IllegalStateException("Wildcard CORS (*) is strictly prohibited in production with credential support.");
        }
        List<String> originList = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        if (originList.isEmpty()) {
            throw new IllegalStateException("Production CORS_ALLOWED_ORIGIN_PATTERNS must contain at least one valid origin.");
        }
        for (String origin : originList) {
            String lower = origin.toLowerCase();
            if (lower.contains("yourdomain.com") || lower.contains("example.com") || lower.contains("replace_with")) {
                throw new IllegalStateException("Production CORS_ALLOWED_ORIGIN_PATTERNS contains placeholder domain: " + origin);
            }
            if (lower.contains("localhost") || lower.contains("127.0.0.1")) {
                throw new IllegalStateException("Production CORS_ALLOWED_ORIGIN_PATTERNS cannot allow localhost/127.0.0.1: " + origin);
            }
            if (!lower.startsWith("https://")) {
                throw new IllegalStateException("Production CORS_ALLOWED_ORIGIN_PATTERNS must enforce HTTPS: " + origin);
            }
        }
    }

    public static void validateDatabaseUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalStateException("Production DATABASE_URL must be configured.");
        }
        String lower = url.trim().toLowerCase();
        if (lower.contains("your-production-db-host") || lower.contains("replace_with")) {
            throw new IllegalStateException("Production DATABASE_URL cannot contain placeholder hostnames: " + url);
        }
    }
}
