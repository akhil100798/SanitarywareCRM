# Sanitaryware CRM Playwright Test Automation Suite

This directory contains Node.js and Playwright automation scripts designed to test the REST APIs, React web administration portal, and Expo mobile-web interfaces of the Sanitaryware CRM.

---

## 1. Prerequisites
1. **Node.js**: Verify installation (`node -v` should be v16 or above).
2. **Java 17 & Maven**: For compiling and running the backend system.
3. **Vite dev server**: For launching the frontend admin UI.

---

## 2. Environment Configuration
Create a `.env` file in the root of the `automation-tests/` folder matching `.env.example`:
```env
BACKEND_BASE_URL=http://localhost:8081
FRONTEND_BASE_URL=http://localhost:5173
MOBILE_WEB_URL=http://localhost:8081
TEST_ADMIN_EMAIL=qaadmin@test.com
TEST_ADMIN_PASSWORD=Password@123
TEST_SALES_EMAIL=qasales@test.com
TEST_SALES_PASSWORD=Password@123
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sanitaryware_crm_test
DB_USER=root
DB_PASSWORD=root
```

---

## 3. Preparation Before Running Tests
Before launching the automation runner, start the application components locally:

```bash
# 1. Boot Backend in dev profile (uses zero-install H2 database)
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=dev"

# 2. Boot Frontend portal
cd frontend
npm run dev
```

---

## 4. Run Scripts & Automation Commands

Execute these commands inside the `automation-tests/` directory:

### Setup dependencies
```bash
npm install
npx playwright install
```

### Verification & Seeding
```bash
# Check backend health status
npm run health

# Populate test categories/products/customers
npm run seed

# Delete test entities
npm run cleanup
```

### Execute Test Suites
```bash
# Run all tests (API, Frontend, Mobile Viewports, Database, and Security)
npm test

# Run API tests only
npm run test:api

# Run Frontend E2E tests only
npm run test:frontend

# Run Mobile viewport checks only
npm run test:mobile

# Run Security tests only
npm run test:security

# Run with visible browser window (headed mode)
npm run test:headed

# Open the HTML execution report
npm run test:report
```

---

## 5. Troubleshooting
* **`ERR_CONNECTION_REFUSED`**: Ensure the backend is active on port `8081` and frontend is running on `5173`.
* **`blocked:csp`**: Requests were directed to an absolute cross-origin address. The frontend config is updated to proxy relative `/api` paths safely.
