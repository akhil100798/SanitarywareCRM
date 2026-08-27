# SanitarywareCRM — Production Runbook

This operational runbook provides step-by-step procedures for deploying, maintaining, monitoring, troubleshooting, and rolling back the SanitarywareCRM platform in production.

---

## 1. Application Architecture Overview

```
[ Clients (Web / Mobile) ]
           │
      HTTPS (Port 443)
           ▼
 [ Nginx / CDN / Vercel Edge ] (SPA Frontend)
           │
   API Reverse Proxy
           ▼
[ Spring Boot Backend 3.2 (Port 8081) ]
           │
      JDBC (SSL)
           ▼
 [ Managed Database (MySQL / PostgreSQL) ]
```

---

## 2. Standard Deployment Procedure

### A. Database Migration
1. Ensure connection credentials are exported in the environment.
2. Flyway will automatically apply new migrations during backend startup when `spring.flyway.enabled=true`.
3. To inspect migration status manually via Maven:
   ```bash
   mvn flyway:info -Dflyway.url=$DATABASE_URL -Dflyway.user=$DATABASE_USERNAME -Dflyway.password=$DATABASE_PASSWORD
   ```

### B. Deploying Backend
1. Build the production Docker image:
   ```bash
   docker build -t sanitaryware-backend:1.0.0 ./backend
   ```
2. Run container with production profile:
   ```bash
   docker run -d --name crm-backend \
     -p 8081:8081 \
     -e SPRING_PROFILES_ACTIVE=prod \
     -e DATABASE_URL="$DATABASE_URL" \
     -e DATABASE_USERNAME="$DATABASE_USERNAME" \
     -e DATABASE_PASSWORD="$DATABASE_PASSWORD" \
     -e JWT_SECRET="$JWT_SECRET" \
     -e CORS_ALLOWED_ORIGIN_PATTERNS="https://crm.example.com" \
     -e FILE_UPLOAD_DIR="/var/lib/sanitaryware-crm/uploads" \
     -v crm-uploads:/var/lib/sanitaryware-crm/uploads \
     --restart unless-stopped \
     sanitaryware-backend:1.0.0
   ```

### C. Deploying Frontend
1. Build the production bundle:
   ```bash
   cd frontend
   npm ci
   VITE_API_BASE_URL="https://api.crm.example.com/api" npm run build
   ```
2. Serve via Nginx container or deploy `dist/` to Vercel/Cloudflare Pages/AWS S3 + CloudFront.

---

## 3. Health & Observability Verification

### Health Probe
```bash
curl -f https://api.crm.example.com/api/health
```
**Expected Response:**
```json
{
  "status": "UP",
  "timestamp": "2026-08-27T12:00:00Z"
}
```

### Log Inspection
```bash
docker logs -f --tail 100 crm-backend
```
Verify:
- Clean Spring Boot startup banner with profile `prod`.
- Flyway migration report: `Successfully applied N migrations`.
- HikariCP connection pool initialized.
- Zero stack traces or unhandled exceptions.

---

## 4. Rollback & Disaster Recovery Procedures

### A. Application Container Rollback
If a defect is identified in a newly deployed backend release:
1. Re-tag or point traffic back to the previous stable container image:
   ```bash
   docker stop crm-backend
   docker rm crm-backend
   docker run -d --name crm-backend [PREVIOUS_STABLE_CONFIG] sanitaryware-backend:previous-stable-tag
   ```

### B. Frontend Rollback
- On Vercel / Cloudflare: Instantly promote the previous successful deployment via the dashboard CLI: `vercel rollback`.
- On Nginx / S3: Re-point the web root symlink or re-upload the previous build artifacts.

### C. Database Backup & Point-In-Time Restore
1. **Manual Backup / Snapshot**:
   ```bash
   mysqldump -h $DB_HOST -u $DB_USER -p --single-transaction --quick --routines --triggers sanitaryware_crm > backup_$(date +%Y%m%d_%H%M%S).sql
   # Or for PostgreSQL:
   pg_dump -h $DB_HOST -U $DB_USER -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump sanitaryware_crm
   ```
2. **Database Restore**:
   ```bash
   # MySQL:
   mysql -h $DB_HOST -u $DB_USER -p sanitaryware_crm < backup_20260827_120000.sql
   # PostgreSQL:
   pg_restore -h $DB_HOST -U $DB_USER -d sanitaryware_crm -v backup_20260827_120000.dump
   ```

---

## 5. Emergency Procedures

### A. Emergency System Lockdown
If unauthorized activity or a compromise is suspected:
1. Invalidate active user sessions by rotating `JWT_SECRET` in environment variables and restarting the backend service. All existing tokens will immediately be rejected with 401 Unauthorized.
2. Review the immutable Audit Logs via `GET /api/audit-logs` or direct query on the `audit_logs` database table.

### B. Database Migration Failure Recovery
1. If a Flyway migration fails:
   - Check `flyway_schema_history` table for `success = false`.
   - Fix the underlying schema issue.
   - Run `mvn flyway:repair` to clean the failed migration record.
   - Re-run application startup.
