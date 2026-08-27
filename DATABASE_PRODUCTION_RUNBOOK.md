# SanitarywareCRM — Database Production Runbook

This operational runbook governs the provisioning, migration, maintenance, backup, restore, and troubleshooting of the production database for SanitarywareCRM.

---

## 1. Database Architecture & Engine Specifications

- **Supported Engines**: PostgreSQL 14+ or MySQL 8.0+ on managed cloud services (AWS RDS, Google Cloud SQL, Azure Database).
- **Connection Configuration**:
  - Connection Pool: HikariCP (`maximum-pool-size: 20`, `minimum-idle: 5`, `connection-timeout: 30000ms`, `idle-timeout: 600000ms`).
  - SSL/TLS: Mandatory (`useSSL=true` or `sslmode=require`).
  - Character Set: `utf8mb4` (MySQL) or `UTF8` (PostgreSQL).
- **Schema Management Engine**: Flyway Community 9.22.3+.
- **Hibernate DDL Setting**: `spring.jpa.hibernate.ddl-auto=validate` (ensures entities match schema without runtime alterations).

---

## 2. Initial Database Setup

1. **Create Database & Dedicated Role**:
   ```sql
   -- PostgreSQL:
   CREATE USER crm_app_user WITH PASSWORD 'STRONG_RANDOMLY_GENERATED_PASSWORD';
   CREATE DATABASE sanitaryware_crm OWNER crm_app_user;
   GRANT ALL PRIVILEGES ON DATABASE sanitaryware_crm TO crm_app_user;

   -- MySQL:
   CREATE DATABASE sanitaryware_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'crm_app_user'@'%' IDENTIFIED BY 'STRONG_RANDOMLY_GENERATED_PASSWORD';
   GRANT ALL PRIVILEGES ON sanitaryware_crm.* TO 'crm_app_user'@'%';
   FLUSH PRIVILEGES;
   ```
2. **Export Environment Variables**:
   ```bash
   export DATABASE_URL="jdbc:mysql://db-host.rds.amazonaws.com:3306/sanitaryware_crm?useSSL=true&serverTimezone=UTC"
   export DATABASE_USERNAME="crm_app_user"
   export DATABASE_PASSWORD="STRONG_RANDOMLY_GENERATED_PASSWORD"
   ```

---

## 3. Flyway Migration Lifecycle

When the application boots with `SPRING_PROFILES_ACTIVE=prod`, Flyway executes all pending migrations automatically in transactional order:
1. `V1__Initial_Schema.sql`: Creates core users, categories, brands, products, customers, quotations, orders, POs, and payments.
2. `V2__Normalize_And_Unique_Customer_Phone.sql`: Applies unique constraints on customer phone numbers.
3. `V3__Add_Product_Catalogue_Tax_And_Barcode_Fields.sql`: Adds barcode, HSN, and GST rates to catalog items.
4. `V4__Add_Product_Catalogue_Search_Indexes.sql`: Builds multi-column search indexes for catalog querying.
5. `V5__Add_Purchase_Order_Item_Tax_And_Barcode_Fields.sql`: Adds tax snapshots to purchase order items.
6. `V6__Add_Sales_Item_Tax_Snapshots.sql`: Adds tax snapshots to quotation and order line items.
7. `V7__Add_Audit_Logs_Table.sql`: Creates the immutable `audit_logs` table.

---

## 4. Production Backup Procedures

### Automated Cloud Snapshots
- Enable automated daily snapshots on AWS RDS / Cloud SQL with a **30-day retention period**.
- Enable Point-In-Time Recovery (PITR) with continuous write-ahead log (WAL) archiving (5-minute RPO).

### Manual CLI Dump Protocol
```bash
# MySQL:
mysqldump -h $DB_HOST -u $DB_USER -p \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  sanitaryware_crm | gzip > crm_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# PostgreSQL:
pg_dump -h $DB_HOST -U $DB_USER \
  -F c -b -v \
  -f crm_backup_$(date +%Y%m%d_%H%M%S).dump \
  sanitaryware_crm
```

---

## 5. Point-In-Time Database Restore Protocol

1. **Quiesce Application Traffic**: Stop the backend container or place into maintenance mode.
2. **Execute Database Restore**:
   ```bash
   # MySQL:
   gunzip < crm_backup_20260827_120000.sql.gz | mysql -h $DB_HOST -u $DB_USER -p sanitaryware_crm

   # PostgreSQL:
   pg_restore -h $DB_HOST -U $DB_USER -d sanitaryware_crm --clean --if-exists -v crm_backup_20260827_120000.dump
   ```
3. **Verify Integrity**: Check table counts and recent transactions:
   ```sql
   SELECT count(*) FROM orders;
   SELECT count(*) FROM audit_logs;
   ```
4. **Restart Backend**: Start backend with `SPRING_PROFILES_ACTIVE=prod` and verify `/api/health` returns `UP`.

---

## 6. Migration Failure Recovery & Troubleshooting

If a Flyway migration encounters a schema conflict during startup:
1. Inspect the `flyway_schema_history` table:
   ```sql
   SELECT installed_rank, version, description, type, script, success FROM flyway_schema_history WHERE success = false;
   ```
2. Diagnose and fix the root cause in the database schema.
3. Repair Flyway metadata using Maven CLI:
   ```bash
   mvn flyway:repair -Dflyway.url=$DATABASE_URL -Dflyway.user=$DATABASE_USERNAME -Dflyway.password=$DATABASE_PASSWORD
   ```
4. Restart application to re-apply the corrected migration.
