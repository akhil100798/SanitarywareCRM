# Sanitaryware CRM — Production Operations Runbook

**Target Environments:** Staging & Production  
**Document Version:** 1.3.0  
**Last Updated:** November 2026  
**Audience:** DevOps Engineers, System Administrators, Site Reliability Engineers  

---

## 1. Architecture Overview

Sanitaryware CRM in production runs as a containerized stack:
- **Web Tier (Port 80/443)**: Multi-stage Nginx 1.27 Alpine container enforcing HTTPS, HSTS, secure headers, and static SPA asset caching.
- **Application Tier (Port 8081)**: Java 17 Spring Boot 3.2.12 REST API container running as an unprivileged `crm` user with loopback binding (`127.0.0.1:8081`).
- **Database Tier (Port 3306)**: Managed MySQL 8.4 instance with Flyway dual-dialect schema migrations and SSL transport.
- **Cache & Rate Limiting (Port 6379)**: Pluggable distributed Redis store (`RATE_LIMITER_STORE=redis`) or high-performance sliding-window in-memory fallback.

---

## 2. First-Time Production Deployment

### Step 2.1 — Server Preparation & Environment File
1. Clone the repository into `/opt/sanitaryware-crm`:
   ```bash
   git clone https://github.com/akhil100798/SanitarywareCRM.git /opt/sanitaryware-crm
   cd /opt/sanitaryware-crm
   ```
2. Copy the production environment template:
   ```bash
   cp .env.example .env
   chmod 600 .env
   ```
3. Populate `.env` with strong production credentials:
   - `JWT_SECRET`: Generate via `openssl rand -base64 48` (min 32 chars).
   - `DATABASE_URL`: Managed MySQL endpoint with `sslMode=VERIFY_IDENTITY`.
   - `DATABASE_USERNAME` & `DATABASE_PASSWORD`.
   - `CORS_ALLOWED_ORIGIN_PATTERNS`: Exact HTTPS FQDNs (e.g. `https://crm.yourcompany.com`).

### Step 2.2 — TLS Certificate Configuration (Let's Encrypt / Commercial)
The container provides internal self-signed certificates out-of-the-box. To deploy real trusted certificates:

1. Obtain certificates using Certbot:
   ```bash
   certbot certonly --standalone -d crm.yourcompany.com
   ```
2. Link or copy the full chain and private key into `/opt/sanitaryware-crm/certs`:
   ```bash
   mkdir -p ./certs
   cp /etc/letsencrypt/live/crm.yourcompany.com/fullchain.pem ./certs/tls.crt
   cp /etc/letsencrypt/live/crm.yourcompany.com/privkey.pem ./certs/tls.key
   chmod 600 ./certs/tls.key
   ```
3. Mount the certificate volume in `docker-compose.prod.yml` under `frontend`:
   ```yaml
   volumes:
     - ./frontend/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
     - ./certs/tls.crt:/etc/nginx/certs/tls.crt:ro
     - ./certs/tls.key:/etc/nginx/certs/tls.key:ro
   ```

### Step 2.3 — Build & Launch Containers
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```
Verify container health:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 3. Health Checks & Observability

### 3.1 — Application Health Endpoints
- **Nginx Ingress Health**:
  ```bash
  curl -k https://127.0.0.1/healthz
  # Expected output: 200 "ok"
  ```
- **Backend Spring Boot Health Check**:
  ```bash
  curl http://127.0.0.1:8081/api/health
  # Expected JSON: {"status":"UP","timestamp":...}
  ```
- **Actuator Health Probe (Detailed)**:
  ```bash
  curl http://127.0.0.1:8081/actuator/health
  # Expected JSON: {"status":"UP","groups":["liveness","readiness"]}
  ```

### 3.2 — Prometheus Metrics Endpoint
Spring Boot Actuator exports Prometheus metrics at `/actuator/prometheus`.  
This endpoint is restricted to authenticated `ADMIN` users:
```bash
curl -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" https://crm.yourcompany.com/actuator/prometheus
```
Key Prometheus metrics to alert on:
- `http_server_requests_seconds_count` & `http_server_requests_seconds_max`: API latency.
- `jvm_memory_used_bytes` / `jvm_memory_max_bytes`: JVM heap headroom.
- `hikaricp_connections_active` / `hikaricp_connections_max`: Database connection pool saturation.
- `rate_limit_429_hits`: Rate limiting threshold triggers.

---

## 4. Automated Database Backup & Disaster Recovery

### 4.1 — Automated Backups via Cron
Backups are managed via `scripts/backup-db.sh`, which performs a compressed `mysqldump` with `--single-transaction`, creates a SHA-256 integrity checksum, and prunes files older than the retention threshold (default 14 days).

Add a nightly cron job on the production host (`crontab -e`):
```cron
# Run daily database backup at 02:00 UTC
0 2 * * * cd /opt/sanitaryware-crm && ./scripts/backup-db.sh >> /var/log/crm-db-backup.log 2>&1
```

Manual execution:
```bash
# Backup against container or host MySQL
./scripts/backup-db.sh
```

### 4.2 — Disaster Recovery Restore Procedure
Restoring requires the explicit confirmation flag `--yes` to prevent accidental overwrites.

```bash
# 1. Stop backend container to prevent write concurrency during restore
docker compose -f docker-compose.prod.yml stop backend

# 2. Execute restore with explicit confirmation flag
./scripts/restore-db.sh backups/sanitaryware_crm_20261124_020000.sql.gz --yes

# 3. Start backend and verify health
docker compose -f docker-compose.prod.yml start backend
curl http://127.0.0.1:8081/api/health
```

---

## 5. Staging Performance & Load Verification (`k6`)

Run the automated load test suite against the staging environment before any production release:

```bash
# 1. Install k6 (if not already installed)
# Ubuntu/Debian: sudo gpg -k && sudo apt-key ... && sudo apt-get install k6
# macOS: brew install k6

# 2. Run k6 load test script
k6 run \
  -e BASE_URL="https://staging.yourcompany.com" \
  -e ADMIN_USER="admin" \
  -e ADMIN_PASSWORD="your-staging-admin-password" \
  scripts/load-test/crm-smoke-load.js
```

### SLA Quality Gate Criteria:
- `http_req_failed{scenario:api_load}`: Must be `0.00%` (zero HTTP 5xx errors).
- `http_req_duration{scenario:api_load}`: `p(95) < 250ms`.
- `rate_limit_burst`: `p(95) < 500ms` with HTTP 429 rate limit triggers safely recorded.

---

## 6. Zero-Downtime Update & Fast Rollback Procedure

### 6.1 — Standard Release Deployment
```bash
# 1. Fetch latest release tag
git fetch --tags
git checkout tags/v1.3.0

# 2. Build and update containers with zero downtime
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps backend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend

# 3. Verify health
docker compose -f docker-compose.prod.yml ps
curl -f http://127.0.0.1:8081/api/health
```

### 6.2 — Emergency Rollback to Previous Version
If any unhandled regression occurs post-deployment:
```bash
# 1. Checkout the previous stable release tag
git checkout tags/v1.2.0

# 2. Rebuild and restart containers
docker build -t sanitarywarecrm-backend:latest ./backend
docker build -t sanitarywarecrm-frontend:latest ./frontend
docker compose -f docker-compose.prod.yml up -d

# 3. In the event of schema incompatibility, restore the pre-deployment database backup:
./scripts/restore-db.sh backups/pre_deployment_v1.3.0.sql.gz --yes
docker compose -f docker-compose.prod.yml restart backend
```
