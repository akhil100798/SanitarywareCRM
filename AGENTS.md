# AGENTS.md — Sanitaryware CRM Repository Rules & Guidelines

This document defines the architecture, principles, and development rules for agents and developers working on the **Sanitaryware CRM** repository.

---

## 1. Project Architecture

Sanitaryware CRM is an enterprise-grade Customer Relationship Management system designed for sanitaryware retail and wholesale operations.

```
SanitarywareCRM/
├── backend/            # Java Spring Boot 3.2.2 REST API
├── frontend/           # React 18 + Vite Web Admin Portal
├── mobile/             # React Native 0.88 + Expo SDK 58 Mobile App
├── automation-tests/   # Playwright E2E & API Test Automation Suite
├── docs/               # Architecture, QA test plans, and superpower specs
├── .superpowers/       # Brainstorming & design artifacts
├── docker-compose.prod.yml
├── docker-compose.staging.yml
└── README.md
```

### Core Architecture Components
- **Backend**: Spring Boot 3.2.2, JDK 17, Spring Data JPA (Hibernate), Spring Security (JWT), Flyway, MySQL 8.0+.
- **Frontend**: React 18, Vite, TailwindCSS, Zustand state management, Axios HTTP client, Lucide icons, react-hot-toast.
- **Mobile**: React Native 0.88.1, Expo SDK 58, React Navigation (Native Stack & Bottom Tabs), Expo SecureStore (native) / sessionStorage (web) for JWT sessions, Axios.
- **Automation Suite**: Node.js Playwright suite covering API endpoints, web frontend, mobile viewports, database integrity, and security checks.
- **Deployment**: Multi-stage Docker builds with Docker Compose for staging and production environments.

---

## 2. Backend Development Rules

1. **Stack & Versioning**: Java 17 and Spring Boot 3.2.2 built with Maven (`mvn`).
2. **Layered Architecture**:
   - `controller/`: REST controllers handling HTTP requests and status codes.
   - `service/`: Interface-driven business logic (`*Service` and `*ServiceImpl`).
   - `repository/`: Spring Data JPA repositories.
   - `entity/`: JPA entities mapping database schema.
   - `dto/`: Data Transfer Objects for request/response payloads. Never expose JPA entities directly to API callers.
   - `security/`: Security filters, UserDetailsService, and JWT tokens.
   - `config/`: Spring bean definitions, security policies, and CORS.
3. **Data Validation**:
   - Validate incoming DTOs using `jakarta.validation` annotations (`@Valid`, `@NotNull`, `@NotBlank`, `@Size`, etc.).
   - Handle validation errors globally using `GlobalExceptionHandler` and standard `ApiErrorResponse`.
4. **Dependency Injection**: Use constructor injection (preferably via Lombok `@RequiredArgsConstructor`).
5. **Spring Profiles**:
   - `default` (no active profile): Local development against configured MySQL database (`application.properties`).
   - `dev`: Local in-memory development profile using disposable H2 database (`application-dev.properties`).
   - `qa`: Local testing profile using zero-install H2 in-memory database (`-Dspring-boot.run.profiles=qa`).
   - `prod`: Production profile with strict schema validation (`ddl-auto=validate`), Flyway migrations enabled, and non-sensitive logging.

---

## 3. Frontend Development Rules

1. **Stack**: React 18, Vite build tool, JavaScript (`.jsx`/`.js`).
2. **Styling & UI**:
   - Use TailwindCSS with custom design tokens.
   - Utilize Lucide React icons and modular component design patterns.
3. **State Management**:
   - Use Zustand for global application state (auth state, user session, cart/order drafts).
   - Keep transient component state local using React `useState`/`useReducer`.
4. **API Integration**:
   - Route all API requests through `src/services/api.js` using Axios.
   - Utilize Vite's development proxy (`/api` -> `http://localhost:8081`) to prevent CORS issues in local development.
5. **UI State & UX**:
   - Handle loading, error, empty, and success states explicitly for all async calls.
   - Display actionable error feedback using `react-hot-toast`.

---

## 4. Mobile Development Rules

1. **Stack**: React Native 0.88.1 on Expo SDK 58 (requires Node.js 20.19.x+).
2. **Navigation**: React Navigation with native stack and bottom tab bar layouts.
3. **Session Persistence**: Securely store JWT auth tokens using `expo-secure-store` on native platforms with deliberate `sessionStorage` fallback on web (`mobile/src/utils/secureSessionStorage.js`).
4. **API Communication**:
   - Base URL must be configurable via environment variables (`EXPO_PUBLIC_API_BASE_URL`).
   - Support Android Emulator (`http://10.0.2.2:8081/api`), physical LAN devices (`http://<LAN_IP>:8081/api`), and production HTTPS endpoints.
5. **Platform Target**: Android (primary) and cross-platform mobile compatibility.

---

## 5. Database & Flyway Rules

1. **Database engine**: MySQL 8.0+ / 8.4 in staging & production, H2 in-memory in dev/qa profiles.
2. **Flyway Schema Versioning & Dual-Dialect Parity**:
   - MySQL migrations: `backend/src/main/resources/db/migration/` (e.g., `V20__Add_Notification_Dispatch_Logs.sql`).
   - H2 dialect parity: `backend/src/main/resources/db/h2/` (e.g., `V20__Add_Notification_Dispatch_Logs.sql`).
   - Dual-dialect rule: Any new migration MUST be added in both locations. The H2 script must avoid MySQL-specific syntax (`ENGINE=InnoDB`, `ON UPDATE CURRENT_TIMESTAMP`, inline foreign key definitions not supported by H2).
   - Parity verification: Run `mvn test -Dtest=FlywayMigrationValidationTest` after adding any migration.
3. **CRITICAL DIRECTIVE**: **Never modify an existing applied Flyway migration script**.
   - Always create a new sequential versioned file (e.g., `V21__<description>.sql`) for schema alterations, new tables, or index additions.
4. **Integrity & Constraints**:
   - Enforce foreign keys, unique constraints, and check constraints explicitly in SQL migrations.
   - Maintain `spring.jpa.hibernate.ddl-auto=validate` in production environments.

---

## 6. API Development Rules

1. **URL Naming**: RESTful resources using lower-case plural nouns (e.g., `/api/customers`, `/api/products`, `/api/quotations`, `/api/orders`).
2. **HTTP Verbs**:
   - `GET`: Fetch resources.
   - `POST`: Create resource or execute domain actions (e.g., `/api/quotations/{id}/convert`).
   - `PUT`: Update existing resource.
   - `DELETE`: Delete or soft-deactivate resource.
3. **Response Envelopes**:
   - Return structured DTO payloads or standardized error envelopes (`ApiErrorResponse`).
4. **CRITICAL DIRECTIVE**: **Never introduce mock APIs when real APIs are required**. Always build or integrate against real backend endpoints.

---

## 7. Authorization Rules & RBAC Matrix

1. **Role Responsibilities & Access Matrix**:
   | Module / Resource | ADMIN | MANAGER | SALES | WAREHOUSE |
   | :--- | :---: | :---: | :---: | :---: |
   | **System Config & User Management** | Full | Read-Only | Denied | Denied |
   | **Product Catalog Management** (POST/PUT/DELETE) | Full | Full | Read-Only | Denied (`403`) |
   | **Product Stock Updates** (`PATCH /api/products/{id}/stock`) | Full | Full | Denied | Allowed (`200`) |
   | **Customer & Contractor Management** | Full | Full | Full | Read-Only |
   | **Quotations & Margin Override** | Full | Full | Full | Denied |
   | **Order Status & Fulfillment Tracking** | Full | Full | Create/View | Status Update |
   | **Payment Entries & Aging Reports** | Full | Full | Create/View | Denied |
   | **Financial & GST Analytics Reports** | Full | Full | Denied | Denied |
   | **System Actuator Prometheus Metrics** | Allowed | Denied | Denied | Denied |
2. **Method Security**:
   - Annotate controller endpoints with Spring Security `@PreAuthorize` (e.g., `@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")` or `@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'WAREHOUSE')")`).
3. **User Bootstrap & Registration**:
   - Public self-registration (`/api/auth/register`) is permitted only during initial setup for bootstrapping the primary `ADMIN`.
   - Subsequent user accounts must be created by authenticated `ADMIN` or `MANAGER` users.
4. **CRITICAL DIRECTIVE**: **Never bypass authorization checks** in controllers or frontend/mobile navigation guards.

---

## 8. Testing Rules

1. **Backend Unit & Integration Tests**:
   - Located in `backend/src/test/java/`.
   - Unit tests for services (`OrderServiceImplTest`, `CustomerServiceImplTest`).
   - Controller tests using Spring Security Test (`@WithMockUser`).
2. **CRITICAL DIRECTIVE**: **Never weaken validation assertions to make tests pass**.
3. **CRITICAL DIRECTIVE**: **Never disable failing tests** (do not use `@Disabled` or comment out assertions to bypass failures). Fix the root cause in the application or test logic.
4. **Verification Command**:
   ```bash
   cd backend && mvn test
   ```

---

## 9. Playwright Rules

1. **Location & Config**: Suite lives in `automation-tests/` with `playwright.config.js`.
2. **Test Suites**:
   - `api/specs`: REST API functional checks.
   - `frontend/specs`: Web portal UI & E2E flows.
   - `mobile/specs`: Mobile viewport responsive testing (Pixel 5, iPhone 13).
   - `database/specs`: Data integrity checks.
   - `security/specs`: Role enforcement and auth security tests.
   - `bug-hunt`: Regression and bug hunt specs.
3. **Test Execution**:
   - Run API tests: `npm run test:api`
   - Run Frontend tests: `npm run test:frontend`
   - Run Mobile tests: `npm run test:mobile`
   - Run all tests: `npm test`
4. **Data Management**:
   - Seed test environment before runs: `npm run seed`
   - Cleanup test artifacts: `npm run cleanup`
   - Check application health: `npm run health`

---

## 10. Security Rules

1. **Authentication**: Stateless JWT authentication with standard HTTP `Authorization: Bearer <token>` header.
2. **Password Security**: Passwords must be hashed using BCrypt before storage.
3. **Secrets Management**:
   - **CRITICAL DIRECTIVE**: **Never commit secrets**, passphrases, or private keys to source control.
   - **CRITICAL DIRECTIVE**: **Never commit `.env` files** containing live production/staging secrets.
   - Mandatory environment variable injection in production (`JWT_SECRET`, `DATABASE_PASSWORD`, `TWILIO_AUTH_TOKEN`).
4. **CORS & Error Handling**:
   - Restrict CORS via `CORS_ALLOWED_ORIGIN_PATTERNS`.
   - Disable internal exception stack trace leakage in production HTTP error responses.

---

## 11. Docker & Deployment Rules

1. **Dockerfile Requirements**:
   - `backend/Dockerfile`: Multi-stage build (Maven 3.9 + Java 17 runtime). Runs under unprivileged `crm` user.
   - `frontend/Dockerfile`: Multi-stage build (Node 20 + Nginx 1.27 alpine).
2. **Orchestration**:
   - `docker-compose.staging.yml`: Runs local MySQL 8.4 container alongside backend and frontend.
   - `docker-compose.prod.yml`: Connects backend to external managed database service.
3. **Health Checks**:
   - Backend health endpoint: `/api/health`
   - Frontend health endpoint: `/healthz`

---

## 12. Git & Branching Rules

1. **Branching Strategy & PR-Only Main Policy**:
   - **CRITICAL DIRECTIVE**: **Never commit or push directly to `main`**.
   - All changes must originate from dedicated branches (`feat/...`, `fix/...`, `chore/...`).
   - Merges into `main` must occur exclusively via Pull Requests after all automated CI jobs pass (100% pass on backend unit/integration tests, frontend tests/lint/build, mobile tests/lint, and security/accessibility suites).
2. **Ignored Files (`.gitignore`)**:
   - **CRITICAL DIRECTIVE**: **Never commit `node_modules`, `target`, build outputs (`dist/`, `build/`), `.expo`, generated test artifacts (`reports/`, `test-results/`), or temporary logs**.
   - Keep `.env.example`, `.env.staging.example`, and `.env.production.example` as clean, non-sensitive templates.
3. **Instruction Compliance**:
   - **CRITICAL DIRECTIVE**: **Do not commit or push unless explicitly instructed by the user**.

---

## 13. Code-Quality Rules

1. **Clean Code Principles**: Keep components small, functions modular, and adhere to DRY (Don't Repeat Yourself).
2. **Dependency Management**:
   - **CRITICAL DIRECTIVE**: **Never use `npm audit --force` without explicit user approval**.
3. **Static Checking & Zero-Warning Enforcement**:
   - Frontend: `npm run lint` enforced with `--max-warnings=0`. Clean Vite build without unresolved imports or broken references.
   - Mobile: `npm run lint` enforced with `--max-warnings=0`. Clean test suite passing under `node --test`.
   - Backend: Clean Maven compile without syntax, deprecation, or annotation errors.

---

## 14. UI/UX Rules

1. **Design System**: Modern, responsive admin UI with TailwindCSS styling.
2. **Consistent Layouts**: Uniform table views, filter headers, modal forms, and metrics cards across entities.
3. **Accessibility**: Maintain WCAG 2.1 AA compliance (contrast, form labels, screen-reader landmarks) verified by automated a11y tests.
4. **Feedback Mechanisms**:
   - Immediate button loading spinners during async actions.
   - Toast notifications for success/error events.
   - Responsive sidebar and navigation adapted for desktop and mobile viewports.

---

## 15. Production-Release & Pre-Commit Rules

1. **CRITICAL DIRECTIVE**: **Never hardcode production data** or development credentials in code files.
2. **Environment Validation**: Verify all required environment variables (`DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGIN_PATTERNS`) are present and non-default before launching in production.
3. **Mandatory Pre-Commit Verification Checklist**:
   Before staging, committing, or pushing any branch, verify the entire local test matrix:
   - **Backend**: `cd backend && mvn test` (must pass 100% with zero failing or skipped assertions).
   - **Frontend**:
     - `cd frontend && npm run lint` (0 errors, 0 warnings).
     - `cd frontend && npm test` (all Vitest unit tests pass).
     - `cd frontend && npm run build` (clean Vite production bundle).
   - **Mobile**:
     - `cd mobile && npm run lint` (0 errors, 0 warnings).
     - `cd mobile && npm test` (all unit/logic tests pass under `node --test`).
   - **Flyway Parity**: `cd backend && mvn test -Dtest=FlywayMigrationValidationTest` (when modifying or adding DB migrations).
