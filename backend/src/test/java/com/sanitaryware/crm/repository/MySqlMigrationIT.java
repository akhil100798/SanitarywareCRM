package com.sanitaryware.crm.repository;

import jakarta.persistence.Entity;
import org.flywaydb.core.Flyway;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

/** Real disposable MySQL, not QA health or Hibernate-created H2 schema. Missing Docker is a failure, not a skip. */
@Testcontainers
class MySqlMigrationIT {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("crm_fresh").withUsername("root").withPassword(UUID.randomUUID().toString());

    @Test void cleanInstallHasAllMigrationsConstraintsAndValidHibernateMappings() throws Exception {
        Flyway flyway = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword()).load();
        flyway.migrate(); flyway.validate();
        assertThat(flyway.info().applied()).hasSize(12);
        assertThat(flyway.info().current().getVersion().toString()).isEqualTo("12");
        try (Connection connection = connection(mysql.getJdbcUrl())) {
            try (ResultSet keys = connection.getMetaData().getImportedKeys("crm_fresh", null, "orders")) {
                assertThat(keys.next()).as("orders must retain real foreign-key constraints").isTrue();
            }
            try (Statement sql = connection.createStatement()) {
                sql.executeUpdate("INSERT INTO customers(name, phone_number, created_at, updated_at) VALUES ('QA first', '9000000000', NOW(6), NOW(6))");
                assertThatThrownBy(() -> sql.executeUpdate("INSERT INTO customers(name, phone_number, created_at, updated_at) VALUES ('QA duplicate', '9000000000', NOW(6), NOW(6))"))
                        .isInstanceOf(SQLException.class).satisfies(error -> assertThat(((SQLException) error).getSQLState()).startsWith("23"));
            }
        }
        var registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.url", mysql.getJdbcUrl())
                .applySetting("hibernate.connection.username", mysql.getUsername())
                .applySetting("hibernate.connection.password", mysql.getPassword())
                .applySetting("hibernate.connection.driver_class", "com.mysql.cj.jdbc.Driver")
                .applySetting("hibernate.dialect", "org.hibernate.dialect.MySQLDialect")
                .applySetting("hibernate.hbm2ddl.auto", "validate")
                .applySetting("hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy")
                .build();
        try {
            MetadataSources sources = new MetadataSources(registry);
            var scan = new ClassPathScanningCandidateComponentProvider(false);
            scan.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
            for (var bean : scan.findCandidateComponents("com.sanitaryware.crm.entity")) {
                sources.addAnnotatedClass(Class.forName(bean.getBeanClassName()));
            }
            try (var factory = sources.buildMetadata().buildSessionFactory()) { assertThat(factory.isOpen()).isTrue(); }
        } finally { StandardServiceRegistryBuilder.destroy(registry); }
    }

    @Test void upgradeFromV9PreservesExistingRowsAndAddsCatalogueOwnershipColumns() throws Exception {
        try (Connection connection = connection(mysql.getJdbcUrl()); Statement sql = connection.createStatement()) {
            sql.executeUpdate("CREATE DATABASE crm_upgrade");
        }
        String url = mysql.getJdbcUrl().replace("crm_fresh", "crm_upgrade");
        Flyway v9 = Flyway.configure().dataSource(url, mysql.getUsername(), mysql.getPassword()).target("9").load();
        v9.migrate();
        assertThat(v9.info().applied()).hasSize(9);
        try (Connection connection = connection(url); Statement sql = connection.createStatement()) {
            sql.executeUpdate("INSERT INTO brands(name, created_at, updated_at) VALUES ('QA retained brand', NOW(6), NOW(6))");
        }
        Flyway latest = Flyway.configure().dataSource(url, mysql.getUsername(), mysql.getPassword()).load();
        latest.migrate(); latest.validate(); assertThat(latest.info().applied()).hasSize(12);
        try (Connection connection = connection(url); Statement sql = connection.createStatement();
                ResultSet row = sql.executeQuery("SELECT name FROM brands WHERE name='QA retained brand'")) {
            assertThat(row.next()).isTrue();
            try (ResultSet columns = connection.getMetaData().getColumns("crm_upgrade", null, "products", "catalogue_import_batch_id")) {
                assertThat(columns.next()).isTrue();
            }
            try (ResultSet columns = connection.getMetaData().getColumns("crm_upgrade", null, "product_images", "catalogue_import_batch_id")) {
                assertThat(columns.next()).isTrue();
            }
            try (ResultSet tables = connection.getMetaData().getTables("crm_upgrade", null, "catalogue_image_cleanup_tasks", null)) {
                assertThat(tables.next()).isTrue();
            }
        }
    }
    private Connection connection(String url) throws SQLException {
        return DriverManager.getConnection(url, mysql.getUsername(), mysql.getPassword());
    }
}
