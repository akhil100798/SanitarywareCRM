# Sanitaryware CRM Automation Test Suite

This directory contains the complete list of 200 automation test cases (100 Positive & 100 Negative) designed to validate the Sanitaryware CRM application.

## 1. Repository Test Coverage Summary

| Area | Positive Test Count | Negative Test Count | Total | Automation Tool | Priority |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Backend / API** | 35 | 40 | **75** | JUnit 5 / MockMvc / REST Assured | Critical |
| **Frontend / Admin** | 25 | 25 | **50** | Playwright / Vitest / RTL | High |
| **Mobile Application**| 20 | 20 | **40** | Playwright (viewport) / Detox | Medium |
| **Database Constraints**| 10 | 10 | **20** | Flyway validation / H2 | High |
| **Deployment / Security**| 10 | 5 | **15** | Docker / curl / Env validation | High |
| **Total Suite Count** | **100** | **100** | **200** | — | — |

---

## 2. Document References

To browse specific verification steps and payloads, click on the detailed files below:

* **100 Positive Scenarios**: [POSITIVE_TEST_CASES.md](file:///d:/SanitarywareCRM/docs/qa/POSITIVE_TEST_CASES.md)
  * Covers successful auth, product creation, customer sales, quotations accept, payment record, and PDF streaming.
* **100 Negative Scenarios**: [NEGATIVE_TEST_CASES.md](file:///d:/SanitarywareCRM/docs/qa/NEGATIVE_TEST_CASES.md)
  * Covers token validation failures, optimistic locking checks, insufficient stock warnings, balance overflows, and security boundary protections.
* **Database & Execution Plans**: [TEST_EXECUTION_PLAN.md](file:///d:/SanitarywareCRM/docs/qa/TEST_EXECUTION_PLAN.md)
  * Outlines backend profiles setup, CI pipeline configurations, and database cleanup commands.
* **Mock Test Data Definitions**: [TEST_DATA_PLAN.md](file:///d:/SanitarywareCRM/docs/qa/TEST_DATA_PLAN.md)
  * Outlines standard test partners, mock catalog, and quote documents.

---

## 3. Automation Framework Recommendations

* **Backend Unit / Integration**:
  * **JUnit 5**: Standard runner for all test classes.
  * **Mockito**: Mocking external services (e.g. SMTP connections, Twilio messaging dispatchers).
  * **MockMvc**: Testing API response properties and controller boundaries without running a full server web container.
* **Frontend Web Testing**:
  * **Playwright**: End-to-end user path automation (Login -> Catalog -> Quotation accept -> Pay -> Download Invoice).
  * **Vitest / React Testing Library**: Component unit isolation tests for forms, navigation layout sidebars, and modals.
* **Mobile Smoke Suite**:
  * **Playwright Expo Web Simulator**: Simulates viewport profiles and verifies screen routing connectivity headlessly.

---

## 4. Test File Creation Plan

Add verification files at the following exact positions:

```
d:\SanitarywareCRM
├── backend/
│   └── src/test/java/com/sanitaryware/crm/
│       ├── controller/
│       │   ├── AuthControllerTest.java (Existing)
│       │   ├── ProductControllerTest.java (Existing)
│       │   ├── CategoryControllerTest.java (New)
│       │   ├── QuotationControllerTest.java (New)
│       │   ├── OrderControllerTest.java (New)
│       │   └── HealthCheckControllerTest.java (New)
│       ├── service/
│       │   ├── OrderServiceImplTest.java (Existing)
│       │   ├── PaymentServiceImplTest.java (Existing)
│       │   └── NotificationServiceImplTest.java (New)
│       └── FlywayMigrationTest.java (New)
├── frontend/
│   └── tests/
│       ├── unit/
│       │   ├── CategoryListPage.test.jsx (New)
│       │   └── ProductListPage.test.jsx (New)
│       └── e2e/
│           ├── login.spec.js (New)
│           ├── products.spec.js (New)
│           ├── quotations.spec.js (New)
│           └── full-flow.spec.js (New)
├── mobile/
│   └── scripts/
│       └── ui-smoke-test.mjs (Existing)
└── docs/
    └── qa/
        ├── AUTOMATION_TEST_CASES.md (This master index)
        ├── POSITIVE_TEST_CASES.md (100 Positive list)
        ├── NEGATIVE_TEST_CASES.md (100 Negative list)
        ├── TEST_DATA_PLAN.md (Predefined mock records)
        └── TEST_EXECUTION_PLAN.md (Execution pipeline setup)
```
