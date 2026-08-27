# SanitarywareCRM — Phase 12 Production Go-Live Gate Checklist

| Area | Inspection Item | Status | Verification Evidence / Notes |
| :--- | :--- | :---: | :--- |
| **A. Code** | Zero unhandled runtime exceptions or raw stack traces exposed | **[PASS]** | Handled by `GlobalExceptionHandler` with structured `ApiErrorResponse` |
| **A. Code** | Zero mock/dummy implementations in production code | **[PASS]** | All operations backed by real JPA / Hibernate entities |
| **B. Tests** | Backend unit & MockMvc test suite passing | **[PASS]** | 156 / 156 tests passing via `mvn clean package` |
| **B. Tests** | Flyway migration and database constraint tests passing | **[PASS]** | 4 / 4 tests passing via `npm run test:database` |
| **B. Tests** | REST API automated test suite passing | **[PASS]** | 75 / 75 tests passing via `npm run test:api` |
| **B. Tests** | Role-based access control and security tests passing | **[PASS]** | 10 / 10 tests passing via `npm run test:security` |
| **B. Tests** | Bug hunt edge cases & deep negative tests passing | **[PASS]** | 21 / 21 tests passing via `npm run test:bughunt` |
| **B. Tests** | Full cross-browser and mobile matrix passing | **[PASS]** | 140 / 140 tests passing via `npm run test:all` |
| **C. Security** | RBAC enforced across ADMIN, MANAGER, and SALES roles | **[PASS]** | Verified at controller layer via `@PreAuthorize` |
| **C. Security** | JWT signing using HMAC SHA-256 with 256+ bit key | **[PASS]** | Key configured via `JWT_SECRET` environment variable |
| **C. Security** | Sensitive data excluded from audit logs and console logs | **[PASS]** | No passwords, JWTs, or secrets in `AuditServiceImpl` |
| **D. Database** | Flyway migrations V1 through V7 execute cleanly | **[PASS]** | Validated in automated CI and runtime logs |
| **D. Database** | Hibernate DDL auto-validation in production | **[PASS]** | Configured as `spring.jpa.hibernate.ddl-auto=validate` |
| **E. Secrets** | Zero secrets, private keys, or passwords committed to Git | **[PASS]** | Clean codebase; secrets injected via environment variables |
| **F. Infrastructure** | Production Dockerfile uses non-root user and health check | **[PASS]** | `crm:crm` user with `HEALTHCHECK` probe on `/api/health` |
| **F. Infrastructure** | Target Cloud Hosting (Render/AWS/ECS) provisioned | **[MANUAL]** | Cloud container deployment required by DevOps engineer |
| **G. Storage** | Persistent volume or S3 bucket attached for uploads | **[MANUAL]** | Mount required on target host at `FILE_UPLOAD_DIR` |
| **H. Monitoring** | Production logging and health monitoring configured | **[PASS]** | Structured Spring Boot logging and `/api/health` probe active |
| **H. Monitoring** | Cloud APM / Alerting configured (Datadog / CloudWatch) | **[MANUAL]** | Integration with cloud monitoring dashboard required |
| **I. Backup** | Automated daily database snapshots & PITR enabled | **[MANUAL]** | Must be activated in AWS RDS / Cloud SQL dashboard |
| **J. DNS/HTTPS** | Custom domain mapped with active SSL/TLS certificate | **[MANUAL]** | DNS mapping and HTTPS certificate provisioning required |
| **K. Deployment** | Production backend JAR packaged without test skips | **[PASS]** | `crm-backend-1.0.0.jar` built successfully |
| **K. Deployment** | Frontend production assets built with Vite | **[PASS]** | Clean `dist/` bundle generated (0 errors) |
| **L. Smoke Testing** | Post-deployment smoke test protocol executed on prod | **[MANUAL]** | To be executed immediately after live DNS switch |
| **M. Rollback** | Container & frontend rollback procedures documented | **[PASS]** | Detailed in `PRODUCTION_RUNBOOK.md` |
| **N. Disaster Recovery**| RPO < 15m and RTO < 60m plan documented | **[PASS]** | Detailed in `DISASTER_RECOVERY_PLAN.md` |
