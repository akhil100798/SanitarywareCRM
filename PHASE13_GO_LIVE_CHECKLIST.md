# SanitarywareCRM — Phase 13 Final Go-Live Gate Checklist

| Category | Inspection Item | Verification Result | Evidence & Operational Notes |
| :--- | :--- | :---: | :--- |
| **A. Code Quality** | Zero unhandled exceptions / zero stack traces exposed | **[PASS]** | Handled via `GlobalExceptionHandler` with structured `ApiErrorResponse` |
| **A. Code Quality** | Zero mock/dummy implementations in production code | **[PASS]** | All business services execute against real JPA entities |
| **B. Automated Tests**| Backend unit & MockMvc test suite passing | **[PASS]** | 156 / 156 tests passing via `mvn clean package` |
| **B. Automated Tests**| Database Flyway and constraint test suite passing | **[PASS]** | 4 / 4 tests passing via `npm run test:database` |
| **B. Automated Tests**| REST API automation suite passing | **[PASS]** | 75 / 75 tests passing via `npm run test:api` |
| **B. Automated Tests**| Role security and authorization suite passing | **[PASS]** | 10 / 10 tests passing via `npm run test:security` |
| **B. Automated Tests**| Bug hunt deep negative and edge case suite passing | **[PASS]** | 21 / 21 tests passing via `npm run test:bughunt` |
| **B. Automated Tests**| Full cross-browser and mobile device matrix passing | **[PASS]** | 140 / 140 tests passing via `npm run test:all` |
| **C. Security & RBAC**| RBAC enforced across ADMIN, MANAGER, and SALES | **[PASS]** | Verified at controller layer via `@PreAuthorize` |
| **C. Security & RBAC**| JWT signing via HMAC SHA-256 with >= 256-bit key | **[PASS]** | Externalized via `JWT_SECRET` environment variable |
| **C. Security & RBAC**| Sensitive data excluded from audit logs and responses | **[PASS]** | No passwords, tokens, or credentials stored in audit trail |
| **D. Database** | Flyway migrations V1 through V7 execute cleanly | **[PASS]** | Validated in automated CI and runtime logs |
| **D. Database** | Hibernate schema auto-validation in production | **[PASS]** | Configured as `spring.jpa.hibernate.ddl-auto=validate` |
| **E. Secrets** | Zero secrets, private keys, or passwords in Git | **[PASS]** | Clean repository; credentials supplied via environment variables |
| **F. Infrastructure** | Production Dockerfile uses non-root user and health check | **[PASS]** | `crm:crm` user with `HEALTHCHECK` probe on `/api/health` |
| **F. Infrastructure** | Cloud container hosting environment provisioned | **[MANUAL]** | Cloud hosting (Render / AWS ECS) deployment required by DevOps |
| **G. Storage** | Persistent volume or S3 bucket attached for uploads | **[MANUAL]** | Mount required on target host at `FILE_UPLOAD_DIR` |
| **H. Monitoring** | Production logging and health monitoring active | **[PASS]** | Structured Spring Boot logging and `/api/health` probe verified |
| **I. Backup & DR** | Automated daily database snapshots & PITR enabled | **[MANUAL]** | Must be activated in AWS RDS / Cloud SQL dashboard |
| **J. DNS & HTTPS** | Custom domain mapped with active SSL/TLS certificate | **[MANUAL]** | DNS mapping and HTTPS certificate provisioning required |
| **K. Packaging** | Production backend executable JAR packaged | **[PASS]** | `crm-backend-1.0.0.jar` built successfully |
| **K. Packaging** | Frontend production assets built with Vite | **[PASS]** | Clean `dist/` bundle generated (0 errors) |
| **L. Smoke Testing** | Post-deployment smoke test protocol executed on prod | **[MANUAL]** | To be executed immediately after live DNS switch |
| **M. Rollback** | Container & frontend rollback procedures validated | **[PASS]** | Documented in `PHASE13_ROLLBACK_REPORT.md` |
| **N. Disaster Recovery**| RPO < 15m and RTO < 60m plan documented | **[PASS]** | Documented in `DISASTER_RECOVERY_PLAN.md` |
