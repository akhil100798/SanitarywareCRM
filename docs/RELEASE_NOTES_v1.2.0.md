# Release Notes — Sanitaryware CRM v1.2.0

**Release Date:** November 22, 2026  
**Target Environments:** Staging & Production  
**Status:** Release Ready (100% Automated Test Matrix Passing)

---

## Executive Summary

Sanitaryware CRM `v1.2.0` represents a milestone release transitioning the platform into enterprise-grade production readiness. Over five focused stabilization and feature phases (P0 through P4), the system has achieved zero ESLint warnings, 100% test pass rate across backend, web, and mobile, automated dependency & container security scanning, WCAG 2.1 AA accessibility compliance, and end-to-end performance benchmarking with k6.

---

## Key Highlights & Milestone Changelog

### P0 — CI Reliability, RBAC Alignment & Test Hygiene
- **RBAC Policy Alignment**: Formally aligned warehouse privileges so that `WAREHOUSE` staff can update product stock quantities (`PATCH /api/products/{id}/stock` $\rightarrow$ `200 OK`) while restricting product catalog creation, modification, and deletion (`POST`, `PUT`, `DELETE` $\rightarrow$ `403 Forbidden`).
- **Deterministic CI Workflows**: Replaced arbitrary sleep timeouts with robust HTTP healthcheck retry polling in `.github/workflows/ci.yml`.
- **Cross-Platform Playwright Configuration**: Resolved Windows-specific shell commands in test configurations to ensure identical execution locally and on Linux CI runners.

### P1 — Frontend QA & Backend Security Hardening
- **Frontend Unit Testing & Linting**: Introduced Vitest, `@testing-library/react`, and ESLint into `frontend/`, accompanied by comprehensive unit test suites for `authStore.js`, `ProtectedRoute.jsx`, `api.js` (stateless 401 token eviction), and quotation/order dynamic total computations.
- **Crash Resilience**: Integrated a top-level React `ErrorBoundary` in `App.jsx` to prevent white-screen crashes on runtime errors.
- **Credential & Secret Protection**: Removed weak hardcoded fallback credentials from `application.properties` into `application-dev.properties`, ensuring non-dev profiles fail fast if required secrets are absent.
- **Endpoint Hardening**: Eliminated the debug endpoint `/api/auth/test` and added sliding-window IP rate limiting on public `/api/portal/**` endpoints.

### P2 — Production Scale, Observability & Accessibility
- **Automated Security & Vulnerability Scanning**: Integrated GitHub Dependabot for Maven, npm, and Docker, alongside Aqua Trivy container image and filesystem CVE scanning in CI.
- **TLS & Production Docker Hardening**: Deployed Nginx reverse proxy with TLS/HTTPS enforcement, HSTS, HTTP$\rightarrow$HTTPS redirection, and unexposed loopback backend containers.
- **Enterprise Observability**: Added Spring Boot Actuator with `/actuator/health` and role-restricted `/actuator/prometheus` (accessible only to `ADMIN`), with structured JSON logging for production.
- **Pluggable Distributed Rate Limiting**: Abstracted rate limiting behind a generic `RateLimiterStore` supporting Redis in multi-instance production environments with in-memory fallback.
- **Accessibility Testing Gate**: Implemented automated Playwright Axe tests validating WCAG 2.1 AA compliance across login, dashboard, product catalogue, and order entry views.

### P3 — Financial Reports & Automated Notifications
- **GST Tax Summary**: Added GSTR-1 and GSTR-3B tax summary computation with Excel and CSV exports featuring CSV formula injection sanitization.
- **Payment Aging Analytics**: Added aging buckets (`0-30`, `31-60`, `61-90`, and `90+` days) with strict `BigDecimal` precision.
- **Dead-Stock & Margin Analytics**: Added inventory turnover reports flagging slow-moving SKUs alongside brand-wise gross margins.
- **Notification Engine**: Built WhatsApp & Email notification dispatch logging (`V20` dual-dialect migration for MySQL & H2) with configurable, test-guarded `@Scheduled` reminder cron jobs.

### P4 — Release Readiness, Mobile QA Boost & Load Testing
- **Zero-Warning Code Quality**: Resolved all 98 frontend warnings and mobile warnings, locking zero warnings permanently with `--max-warnings=0` in both `frontend/package.json` and `mobile/package.json`.
- **Mobile QA Coverage**: Expanded mobile unit tests to 46 passing tests under `node --test`, thoroughly covering formatters, storage abstractions, Axios interceptor token lifecycles, and offline sync conflict resolution & max retry thresholds.
- **Repeatable Load & Stress Suite**: Added `scripts/load-test/crm-smoke-load.js` (`k6`) measuring p95 latency (< 250ms), 0% 5xx errors, and rate limit burst resilience under 50 RPS.
- **Engineering Directives**: Updated `AGENTS.md` with PR-only `main` branch policy, dual-dialect Flyway rules, complete RBAC matrix, and mandatory pre-commit verification checklists.

---

## Verification Summary

| Component | Test Suite | Pass Count | Warnings / Errors |
| :--- | :--- | :--- | :--- |
| **Backend** | Maven (`mvn test`) | 100% Pass | 0 Errors |
| **Frontend** | ESLint (`npm run lint`) | 100% Pass | 0 Errors, 0 Warnings (`--max-warnings=0`) |
| **Frontend** | Vitest (`npm test`) | 28 / 28 Pass | 0 Failures |
| **Frontend** | Vite Build (`npm run build`) | Built Cleanly | 0 Errors |
| **Mobile** | ESLint (`npm run lint`) | 100% Pass | 0 Errors, 0 Warnings (`--max-warnings=0`) |
| **Mobile** | Node Test (`npm test`) | 46 / 46 Pass | 0 Failures |
| **E2E / Security** | Playwright (`npm run test:security`) | 100% Pass | 0 Violations |
| **Accessibility**| Playwright Axe (`npm run test:a11y`) | 4 / 4 Pass | 0 Violations |

---

## Upgrade & Deployment Instructions

1. **Database Migrations**: Apply Flyway migrations through `V20__Add_Notification_Dispatch_Logs.sql`.
2. **Environment Variables**:
   - Ensure `JWT_SECRET`, `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `CORS_ALLOWED_ORIGIN_PATTERNS` are supplied in production.
   - For Redis rate limiting, set `SECURITY_RATE_LIMITER_STORE=redis` and configure `SPRING_DATA_REDIS_HOST`.
3. **Docker Deployment**:
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```
