# Sanitaryware CRM Confirmed Bug Fix Design

**Date:** 2026-07-18

## Goal

Fix only the ten confirmed bugs and production blockers documented in `docs/qa/FULL_STACK_BUG_HUNT_REPORT.md`, add regression coverage before each production change, and determine release readiness from fresh backend, frontend, Playwright, dependency, and Compose verification.

## Scope and constraints

- Do not redesign the UI.
- Do not remove existing tests or weaken assertions to create a pass.
- Do not skip failing tests.
- Do not commit real secrets.
- Do not use H2 as production proof.
- Add or update tests for every fix.
- Use test-driven development: focused regression test fails for the expected reason before production code changes.
- Preserve existing untracked QA artifacts unless a test is deliberately replaced by a stronger tracked regression test.
- Do not claim a fix or release readiness without fresh command output.

## Delivery approach

Use risk-first stages:

1. Backend authorization.
2. Sanitized error handling and data validation.
3. Frontend role behavior and dashboard greeting.
4. Pagination and Playwright discovery.
5. Production configuration, Docker packaging, and safe dependency upgrades.
6. Full verification and bug-fix report.

Each stage uses a red-green-refactor loop and focused verification before moving to the next stage.

## Backend authorization

Spring Security method authorization remains the source of truth.

### Products

Allow `ADMIN` and `MANAGER` to:

- Create products.
- Update products.
- Delete/deactivate products.
- Patch stock.
- Upload bulk catalog data.

Allow all authenticated roles, including `SALES`, to:

- List and view products.
- Search products.
- Filter by category or brand.
- View low-stock and featured products.

Playwright API coverage will prove ADMIN and MANAGER mutation access, SALES mutation denial, and SALES read/search access.

### System settings

- Allow all authenticated roles to read settings because shared company metadata is used by the UI and generated documents.
- Allow `ADMIN` and `MANAGER` to update settings.
- Deny SALES and unauthenticated updates.
- Return a sanitized 403 response such as `You do not have access to this resource.`

## API error contract

Introduce a consistent sanitized error response containing:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid request"
}
```

The status and error text change for 403, 404, and 409 responses. Safe business messages may identify a missing resource or duplicate field, but responses must not include SQL, database column names, Java signatures, stack traces, exception class names, or framework messages.

Add explicit handlers for:

- `HttpMessageNotReadableException` as 400.
- `MethodArgumentNotValidException` as 400 with safe field validation details.
- `MissingServletRequestParameterException` as 400.
- `TypeMismatchException` as 400.
- `NoResourceFoundException` as 404.
- `AccessDeniedException` as 403.
- `ResourceNotFoundException` as 404.
- `DataIntegrityViolationException` as a sanitized 409.
- Unexpected runtime exceptions as a generic 500 without internal text.

Regression tests cover null bodies, malformed JSON, unknown authenticated routes, missing parameters, type mismatches, conflicts, and absence of internal details.

## Purchase-order reference validation

Validate references before persistence:

- A missing distributor ID returns a controlled 404.
- Every missing product ID returns a controlled 404.
- Mappers must not silently convert an unresolved ID into a null relationship.
- The service owns reference resolution so creation and update follow the same policy.

Tests cover invalid distributor and invalid product IDs and assert sanitized responses.

## Customer validation and normalization

### Customer type

`customerType` remains optional. A missing or null value becomes `RETAIL` before persistence and is returned as `RETAIL`.

### Email

- Email remains optional.
- Blank email is normalized to null.
- Nonblank email is trimmed and must pass `@Email` validation.
- Email uniqueness remains enforced and duplicate conflicts return sanitized 409 responses.

### Phone

- Primary phone is required.
- Normalize phone input before lookup and persistence by trimming whitespace and removing every non-digit character; persist and compare the resulting digit-only value.
- Enforce primary phone uniqueness in both service logic and a new Flyway migration.
- Create and update must exclude the current customer ID when checking duplicates.
- Duplicate phones return a sanitized 409 response.

Tests cover default type, valid and invalid email, blank email, duplicate email, normalized duplicate phone, and update behavior.

## Pagination contract

Paginated endpoints use explicit integer request parameters rather than relying on silent framework normalization:

- Default page: `0`.
- Default size: `20`.
- Minimum page: `0`.
- Minimum size: `1`.
- Maximum size: `100`.
- Invalid values return sanitized 400 responses.

Apply the same contract to products, customers, distributors, orders, quotations, payments, purchase orders, and distributor payments where pagination is exposed. Preserve current sorting behavior by constructing `PageRequest` with the requested sort values or by validating a shared pagination request helper.

## Frontend authorization and messaging

Backend permissions remain authoritative. Frontend checks prevent misleading navigation and forbidden forms.

### Route guard

Extend `ProtectedRoute` to accept an array of allowed roles. Unauthenticated users continue to reach Login. Authenticated users without an allowed role render a dedicated Unauthorized page with the message:

> You don’t have access to this page.

### Role policy

Allow SALES to keep dashboard, customers, product listing, quotations, orders, payments, and profile workflows permitted by backend policy.

Restrict these routes to ADMIN and MANAGER:

- Settings.
- Distributors and distributor forms.
- Purchase orders and purchase-order forms.
- Distributor payments and forms.
- Product create and edit routes.

Category and brand read access remains available where current product workflows need it. Mutation controls for category and brand management are hidden from SALES rather than removing required read data.

The sidebar filters management-only links for SALES. Direct URL access is independently guarded.

### Dashboard greeting

Remove hardcoded Administrator text. Prefer the authenticated user’s full name. If unavailable, use a role-aware fallback such as `Sales Staff`, `Manager`, or `Administrator`.

Playwright tests verify SALES navigation, direct-route denial and message, ADMIN visibility, ADMIN settings access, and absence of the Administrator greeting for SALES.

## Playwright discovery and test quality

Change project matching so paths under `api/specs`, `frontend/specs`, `security/specs`, and `database/specs` are discovered regardless of filename labels. Keep mobile projects restricted to mobile specs and keep bug-hunt specs separately runnable.

Provide scripts for:

- Full test suite.
- Security tests.
- Database tests.
- Bug-hunt tests.

Update the stale customer constraint test to verify intentional soft deletion and retained order relationships. Do not accept a 500 response as a success condition.

## Production configuration

### Spring profile

Add `application-prod.properties` with required placeholders and no weak fallbacks for:

- `DATABASE_URL`.
- `DATABASE_USERNAME`.
- `DATABASE_PASSWORD`.
- `JWT_SECRET`.

Production uses MySQL, validates schema through Flyway/JPA validation, disables development tooling and H2 behavior, and never includes stack traces in API responses. Dev and QA retain their local H2 settings and placeholder-only secrets.

### Containers

Add:

- `docker-compose.staging.yml` with MySQL, backend, and frontend services plus health-dependent startup.
- `docker-compose.prod.yml` with backend and frontend services and an externally supplied production database.
- `frontend/Dockerfile` using a Node build stage and nginx runtime stage.
- `frontend/nginx.conf` with SPA fallback and `/api` reverse proxying.
- `.env.staging.example` and `.env.production.example` containing placeholders only.

Both Compose files must pass `docker compose ... config` without real secrets in the repository.

## Dependency updates

Run the production frontend audit, apply safe patch/minor upgrades for axios, form-data, React Router, and transitive redirect handling, then rebuild and rerun the audit. Never use `npm audit fix --force`. If eliminating a finding requires a breaking major upgrade, document it as remaining rather than silently accepting the change.

## Verification gates

Run and record:

1. Backend `mvn clean test` and `mvn clean package`.
2. Frontend `npm install`, `npm run build`, and `npm audit --omit=dev`.
3. Automation `npm install`, health, seed, full suite, explicit security suite, explicit database suite, and focused bug-hunt suite.
4. Staging and production Compose configuration validation.
5. Targeted original reproductions for every confirmed bug.

The project may be called release ready only when both high bugs are fixed, required security tests pass, backend tests/package pass, frontend build passes, Compose configuration validates, and no unresolved production audit result violates the release gate. Otherwise the verdict is staging-ready-only or not release ready with exact remaining evidence.

## Deliverables

- Production and test code implementing only confirmed fixes and blockers.
- New Flyway migration for unique normalized customer phone data.
- Staging and production container definitions and example environments.
- Updated Playwright discovery/scripts.
- `docs/qa/BUG_FIX_VERIFICATION_REPORT.md` using the requested verification-report structure.
