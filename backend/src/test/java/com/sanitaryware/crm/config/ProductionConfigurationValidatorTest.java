package com.sanitaryware.crm.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionConfigurationValidatorTest {

    @Test
    @DisplayName("Valid production settings pass all validation checks")
    void validProductionSettingsPass() {
        assertDoesNotThrow(() -> {
            ProductionConfigurationValidator.validateDatabasePassword("SuperSecureP@ssw0rd2026!");
            ProductionConfigurationValidator.validateJwtSecret("a-very-strong-production-jwt-secret-key-that-is-at-least-256-bits-long!");
            ProductionConfigurationValidator.validateCorsOrigins("https://crm.company.com,https://admin.company.com");
            ProductionConfigurationValidator.validateDatabaseUrl("jdbc:mysql://prod-rds.internal:3306/crm_prod?sslMode=VERIFY_IDENTITY");
        });
    }

    @Test
    @DisplayName("Insecure database passwords throw IllegalStateException")
    void insecureDatabasePasswordsFail() {
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabasePassword(null));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabasePassword("   "));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabasePassword("root"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabasePassword("password"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabasePassword("1607"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabasePassword("replace_with_secure_password"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabasePassword("short"));
    }

    @Test
    @DisplayName("Insecure JWT secrets throw IllegalStateException")
    void insecureJwtSecretsFail() {
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateJwtSecret(null));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateJwtSecret("short_key"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateJwtSecret("local-only-change-me-please-change-this-secret-123456"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateJwtSecret("replace_with_very_long_secure_random_secret_min_32_chars"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateJwtSecret("your_jwt_secret_key_here_must_be_at_least_256_bits_long_for_hs256"));
    }

    @Test
    @DisplayName("Insecure or placeholder CORS configurations throw IllegalStateException")
    void insecureCorsConfigurationsFail() {
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateCorsOrigins(null));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateCorsOrigins("*"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateCorsOrigins("https://yourdomain.com"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateCorsOrigins("http://localhost:5173"));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateCorsOrigins("http://crm.company.com")); // non-HTTPS
    }

    @Test
    @DisplayName("Placeholder database URL throws IllegalStateException")
    void placeholderDatabaseUrlFails() {
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabaseUrl(null));
        assertThrows(IllegalStateException.class, () ->
                ProductionConfigurationValidator.validateDatabaseUrl("jdbc:mysql://your-production-db-host:3306/crm"));
    }
}
