package com.sanitaryware.crm.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionConfigurationTest {

    private static final Path PROD_CONFIG = Path.of(
            "src", "main", "resources", "application-prod.properties");

    @Test
    void productionConfigurationRequiresSecretsAndDisablesUnsafeDiagnostics() throws IOException {
        assertTrue(Files.exists(PROD_CONFIG), "application-prod.properties must exist");

        Properties properties = new Properties();
        try (Reader reader = Files.newBufferedReader(PROD_CONFIG)) {
            properties.load(reader);
        }
        String content = Files.readString(PROD_CONFIG);

        assertRequiredVariable(properties, "spring.datasource.url", "DATABASE_URL");
        assertRequiredVariable(properties, "spring.datasource.username", "DATABASE_USERNAME");
        assertRequiredVariable(properties, "spring.datasource.password", "DATABASE_PASSWORD");
        assertRequiredVariable(properties, "jwt.secret", "JWT_SECRET");
        assertRequiredVariable(properties, "app.cors.allowed-origin-patterns", "CORS_ALLOWED_ORIGIN_PATTERNS");

        assertEquals("validate", properties.getProperty("spring.jpa.hibernate.ddl-auto"));
        assertEquals("true", properties.getProperty("spring.flyway.enabled"));
        assertEquals("false", properties.getProperty("spring.h2.console.enabled"));
        assertEquals("never", properties.getProperty("server.error.include-stacktrace"));
        assertEquals("never", properties.getProperty("server.error.include-message"));
        assertEquals("false", properties.getProperty("server.error.include-exception"));

        assertFalse(content.contains("${DATABASE_USERNAME:root}"));
        assertFalse(content.contains("${DATABASE_PASSWORD:"));
        assertFalse(content.contains("${JWT_SECRET:"));
        assertFalse(content.toLowerCase().contains("jdbc:h2:"));
        assertFalse(content.contains("local-only-change-me"));
    }

    private void assertRequiredVariable(Properties properties, String propertyName, String variableName) {
        assertEquals("${" + variableName + "}", properties.getProperty(propertyName),
                propertyName + " must require " + variableName + " without a fallback");
    }
}
