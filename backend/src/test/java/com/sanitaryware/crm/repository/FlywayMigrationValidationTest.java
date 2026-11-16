package com.sanitaryware.crm.repository;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("qa")
public class FlywayMigrationValidationTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("POS-081: Flyway migrations execute completely with verified history and success")
    void flywayMigrationsExecutedCleanlyWithHistory() {
        assertThat(flyway).isNotNull();
        MigrationInfo[] applied = flyway.info().applied();
        assertThat(applied).isNotEmpty();
        assertThat(applied.length).isGreaterThanOrEqualTo(11);

        for (MigrationInfo info : applied) {
            assertThat(info.getState().isApplied()).isTrue();
            assertThat(info.getState().isFailed()).isFalse();
            assertThat(info.getChecksum()).isNotNull();
        }

        // Query flyway_schema_history directly
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT version, description, type, script, checksum, installed_by, success FROM flyway_schema_history ORDER BY installed_rank ASC"
        );
        assertThat(rows).isNotEmpty();
        assertThat(rows.size()).isGreaterThanOrEqualTo(11);

        for (Map<String, Object> row : rows) {
            Object success = row.get("success");
            boolean isSuccessful = success instanceof Boolean ? (Boolean) success : ((Number) success).intValue() == 1;
            assertThat(isSuccessful).as("Migration version %s must be successful", row.get("version")).isTrue();
        }
    }

    @Test
    @DisplayName("POS-082: Schema validation proves all entities match migration schema")
    void schemaValidationMatchesMigrations() {
        // Since @ActiveProfiles("qa") specifies spring.jpa.hibernate.ddl-auto=validate,
        // successful SpringBootTest context initialization proves Hibernate schema validation passed.
        Integer brandCount = jdbcTemplate.queryForObject("SELECT count(*) FROM brands", Integer.class);
        assertThat(brandCount).isNotNull();

        Integer productCount = jdbcTemplate.queryForObject("SELECT count(*) FROM products", Integer.class);
        assertThat(productCount).isNotNull();

        Integer paymentRequestCount = jdbcTemplate.queryForObject("SELECT count(*) FROM payment_requests", Integer.class);
        assertThat(paymentRequestCount).isNotNull();
    }
}
