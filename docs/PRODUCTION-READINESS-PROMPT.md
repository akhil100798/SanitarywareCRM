# Sanitaryware CRM: implementation and verification prompt

Paste the launch prompt below into a coding-agent session opened at this repository. This file is the detailed specification. It requests implementation work; generating this specification does not itself authorize deployment, commits, pushes, or changes to real business data.

## Copyable launch prompt

```text
Read AGENTS.md, docs/REPOSITORY-ASSESSMENT-2026-11-10.md, and
docs/PRODUCTION-READINESS-PROMPT.md in this repository.

Implement Phase 1 of the production-readiness specification. Start by checking
the current worktree and reproducing the relevant findings; the assessment is
historical evidence, not a substitute for inspecting today's code.

Fix the underlying financial and inventory invariants, add meaningful MySQL
regression tests, and verify both API write paths and affected client behavior.
Preserve unrelated uncommitted work, authorization rules, supported workflows,
and applied Flyway migration history. Do not weaken tests or security controls.

Create/update docs/REMEDIATION-TRACKER.md with the finding IDs, acceptance
criteria, changes, exact test results, evidence paths, and remaining blockers.
Carry this phase through implementation and verification; do not stop at a plan.
At the phase boundary, report what passed, what failed, and what remains.
Do not start a different phase, commit, push, deploy, send real notifications,
or change real business data. Do not award a 10/10 score without evidence.
```

## Working contract

Outcome: make the CRM correct, secure, maintainable, usable, and operationally verifiable across the web portal, backend, database, native Android app and supported Expo web target. A score is a conclusion from evidence, not the implementation objective.

Before changes:

- Read repository instructions and inspect git status, current code, configuration and available runtime tools. Preserve pre-existing work; do not reset, clean, stash or overwrite unrelated changes.
- Revalidate the selected findings. Distinguish application defects, test-fixture defects, environment failures and unverified risks. Read ignored audit artifacts if present; recreate safe synthetic reproductions if they are absent.
- Record an actionable phase backlog. Keep the modular monolith unless concrete requirements justify an architecture change. Prefer cohesive fixes over unrelated rewrites.
- Use isolated databases, ports, volumes and synthetic data. The open HubSpot CSV exports are outside this task; do not import or modify them.

During implementation:

- Use real backend endpoints. Keep DTO validation, role/ownership checks, BCrypt, secure native token storage, production schema validation and certificate verification intact.
- Do not edit applied Flyway scripts, disable failing tests, weaken assertions, use production mock APIs, run npm audit --force, add placeholder secrets, or make upload volumes world-writable.
- Do not claim a diagnostic override is a deployment fix. Flyway-disabled H2 and relaxed TLS certificate verification are not release acceptance configurations.
- Make routine reversible choices autonomously. If genuinely blocked by unavailable tools or required business policy, report the precise dependency and continue independent work in the selected phase. Do not repeat equivalent retries indefinitely.
- Run checks appropriate to each change. Broaden testing when a new failure, integration risk or final release gate requires it. Avoid repeating unchanged green suites without a reason.

## Phase 1 — Financial and inventory correctness

Findings: F01, F02, F03; also investigate related supplier-payment, purchase-receipt, reversal and order-edit paths for the same invariants.

1. Serialize conflicting mutations at the correct aggregate boundary. Cover validation, ledger insertion/reversal, order balances and payment status in one consistent transaction strategy. Use consistent lock ordering and controlled handling of transient conflicts/deadlocks. A generic HTTP 500 is not acceptable conflict behavior.
2. Introduce a durable idempotency contract for payment creation/retry. Define key scope, request matching, persistence and response behavior. A repeated identical request must not insert another receipt; reusing a key for different payment data must be rejected clearly. Preserve client compatibility and document rollout.
3. Derive payment status from authoritative financial facts. Eliminate arbitrary PAID/PARTIAL assignments that contradict balances. Preserve any legitimate reconciliation/refund policy through explicit authorized, audited domain actions. Do not invent financial business rules silently.
4. Centralize inventory reservation transitions used by POST, PUT, PATCH, quotation conversion and cancellation. Item edits and status changes must apply one correct atomic delta, including repeated product lines and concurrent orders. Protect against overselling and duplicate stock restoration.
5. Review existing-data repair separately from request-path fixes. Provide a dry-run reconciliation report and a reviewed repair procedure. Never silently rewrite historical payment/stock data.

Acceptance evidence:

- Deterministic MySQL integration tests coordinate competing transactions, rather than relying only on timing sleeps or mocked repositories.
- For a fresh order of 100, two simultaneous payments of 60 cannot both be accepted; the ledger, paid amount, balance and status reconcile after every outcome. Repeat with a bounded stress run and include payment/reversal races.
- Duplicate payment retries with the same key have one financial effect. Conflicting key reuse has a controlled error. Failed transactions leave no partial records.
- Stock 1000, quantity 1: PENDING to CONFIRMED gives 999; cancellation returns to 1000. Verify PUT and PATCH, item changes, retries and concurrent competing orders.
- An unpaid order cannot become PAID merely by changing an enum. Reducing an order below recorded payments follows a documented, validated policy.
- A real client workflow creates a quotation/order, records payment and refreshes the reconciled balances. Client changes include actionable conflict/retry feedback.

## Phase 2 — Migrations and deployable containers

Findings: F04, F05, F06, F10, F11.

- Restore the documented QA startup with migrations enabled. Choose a compatible QA migration strategy while preserving deployed MySQL migration contents and checksums. A later migration alone cannot repair SQL that prevents an earlier migration from executing.
- Test fresh MySQL 8.4 installation and upgrade from a representative prior schema with retained data. Run Flyway validation and Hibernate ddl-auto=validate. Inspect history/checksums/schema directly; SELECT 1 does not prove migration correctness.
- Provision a trusted CA and hostname-matching database certificate/truststore for staging. Standard documented startup must pass VERIFY_IDENTITY without the audit's diagnostic override. Keep production verification strict.
- Provision fresh upload-volume ownership for the non-root crm runtime. Verify images, bill-pad references and catalogue files can upload/download under the intended permissions. Verify persistence after container recreation/restart.
- Make builds reproducible from a clean checkout with documented local-workspace requirements. Distinguish the OneDrive build-context/reparse-point issue from Dockerfile defects.
- Replace fixed startup sleeps with bounded readiness polling and useful diagnostics. Ensure the same documented commands work on supported Windows and Linux environments.

Acceptance: standard Compose startup from a fresh environment, healthy backend/frontend/database, real migration history, successful authorized uploads/downloads, rejected unauthorized access, non-root runtime and no diagnostic security overrides. Include reproducible commands and redacted logs.

## Phase 3 — Mobile, web UX and authentication behavior

Findings: F09, F12; remaining manual and native verification gaps.

- Implement deliberate platform-specific session storage. Keep SecureStore on native Android; provide an explicit secure web session design for the supported Expo web target. Do not remove a supported target merely to make the audit green.
- Exercise real storage adapters on their platforms, not just injected mocks. Cover restoration, expiry, logout, rejected tokens, stale responses, offline transitions and retries.
- Map disabled-account authentication to a controlled 401/403 response. Preserve rejection of disabled users' existing tokens, manager privilege boundaries and last-admin protection.
- Review every main module across ADMIN, MANAGER, SALES and WAREHOUSE: dashboard; customers; brands/categories; products/catalogue imports; quotations/PDF/conversion; orders/stock; customer payments; distributors/purchases/supplier payments; reports; audit logs; settings/users/profile.
- Verify loading, empty, validation, error, success and permission states; duplicate submits; slow/offline requests; keyboard operation; visible focus; labels; modal focus/escape behavior; contrast; and narrow-screen layouts. Preserve the existing design system and avoid a cosmetic rewrite that leaves functional gaps.
- Verify Android on an emulator/device: actual install/launch, login, secure persistence, app restart, navigation/back behavior, keyboard, quotation/order/payment flow and role restrictions. An Android export and a web mobile viewport do not prove native acceptance.
- Validate catalogue preview/import against representative anonymized supplier fixtures, ambiguous/conflicting SKUs and bounded large-file/resource behavior.

Acceptance: verified web and native workflows with test/device details, screenshots where useful and clear untested cases. If manual browser or native tooling is unavailable, leave those gates BLOCKED with reproducible handoff steps; never label them passed.

## Phase 4 — Test reliability, security, performance and operations

Findings: F07, F08 and the architecture/security/performance observations in the assessment.

- Give each test its own valid fixtures and run identifiers. Replace fixed-ID cleanup and global first-UNPAID-order selection. Cleanup must target only owned records, report failures, and work safely on reruns.
- Run API, security, web and responsive tests against the real container-backed deployment using the exact configured origin. Preserve both failed and successful evidence; do not turn origin/fixture mistakes into alleged application defects.
- Make CI cold startup cross-platform, readiness-based and self-contained. Add real MySQL migration/concurrency gates, clean dependency installation, web builds and mobile checks. Do not treat previous audit test counts as immutable targets; preserve meaningful coverage.
- Remove production-secret fallbacks and validate missing/default configuration at startup. Review effective CORS, security headers, error envelopes, file validation/download authorization and dependency advisories. Upgrade compatible dependencies deliberately and retest affected paths.
- Bound rate-limiter memory, define trusted proxy handling and verify behavior for the intended instance topology. Do not trust arbitrary forwarded headers or add distributed infrastructure without deployment justification.
- Move report filtering/aggregation into database queries where appropriate; paginate unbounded endpoints, inspect query plans and address measured N+1/index problems. Measure a documented representative workload on declared hardware. Record latency, throughput, errors and memory; do not infer scalability from unit tests.
- Make notification delivery failure and retry behavior explicit, durable and observable where the supported workflow requires it. Test with provider sandboxes; do not send messages to real customers without explicit authorization.
- Add useful structured logs/metrics and operational diagnostics without secrets or customer-data leakage. Verify health/readiness behavior during dependency failure.
- Repeat logical backup/restore and restart/token-revocation checks after schema/security changes. Document backup retention, off-site recovery, upgrade/rollback strategy and proposed RTO/RPO. Distinguish measured local recovery from untested production recovery objectives.
- Reconcile README, AGENTS.md, env examples and actual supported mobile/runtime/profile/port configuration. Preserve higher-priority project rules; document intentional version decisions rather than silently changing policy.

## Phase 5 — Independent release review

Review the final tree and evidence from a fresh reviewer session. This review should examine correctness, regressions and missing verification, rather than accept the implementer's scores.

Required verification includes:

- Backend tests and meaningful real-MySQL regression/concurrency tests.
- Frontend clean install, utility/component checks as appropriate and production build.
- Mobile clean install, lint, tests, Android export and actual device/emulator acceptance.
- Fresh and upgrade migration paths, strict-TLS staging startup, upload/download permissions and restart persistence.
- API/security/web/responsive suites, bug-hunt regressions and manual role/workflow/accessibility checks.
- Relevant dependency findings triaged; deployment/recovery/load evidence matched to stated requirements.

Use the repository's actual scripts, including backend mvn test, frontend npm test/build, mobile lint/test/export:android, and automation API/frontend/mobile/database/security/bug-hunt suites. Establish healthy isolated services and fixtures first. Do not disable Flyway, skip failed cases or relax certificate verification to satisfy a gate.

Final deliverables:

1. docs/REMEDIATION-TRACKER.md: each F01–F12 finding plus additional verified findings, status, changed paths, acceptance result and evidence.
2. docs/RELEASE-VERIFICATION.md: environment, exact commands, results, limitations, regression coverage and reproduction steps.
3. Updated assessment: separate historical baseline from the current state; score backend correctness, frontend, mobile, design, database, security, testing, performance, operations and documentation with explicit justification.
4. A concise decision: READY, NOT READY or BLOCKED. List unresolved release gates and the precise external actions needed.

Only call a finding FIXED after its original reproduction is prevented and the relevant regression/integration tests pass. Only call a gate PASSED after inspecting its actual evidence. Missing manual/device/provider/production access remains unverified. Do not fabricate a 10/10 verdict or treat a high average score as permission to overlook a critical defect.
