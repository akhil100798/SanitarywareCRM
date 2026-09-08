# CRM Security Remediation Report

**Scope:** remediation of the front-end/grey-box audit findings supplied on 7 September 2026. No commit was created.

## Outcome

The three priority authorization/data-exposure defects are fixed and were rechecked against the isolated QA instance:

| ID | Finding | Result | Evidence |
| --- | --- | --- | --- |
| S01 | Any authenticated user could fetch a known attachment path. | Fixed | Attachment owner: 200; second Sales user: 403; Admin: 200; anonymous: 401. |
| S02 | WAREHOUSE could read and mutate customer data. | Fixed | WAREHOUSE received 403 for list, detail, active, search, type, create, update and delete customer routes. |
| S03 | SALES product responses included `purchasePrice`. | Fixed | The field is omitted from Sales detail and list JSON; Admin retains it. |

Other remediations include server-side logout revocation, login throttling, upload signature checks, web and mobile role-aware navigation, profile-phone persistence, payment search, storage cleanup, accessible customer form labels, modal keyboard focus handling, and a not-found page.

## Security controls implemented

- Attachment downloads are authorized against the associated order, purchase order, or product image before bytes are read. Unknown managed paths return a generic 404.
- Customer endpoints and direct front-end routes permit only ADMIN, MANAGER, and SALES. This is server-side enforcement, not navigation hiding.
- `purchasePrice` is serialized only for ADMIN and MANAGER product reads.
- Logout revokes the presented bearer token until its expiry; the JWT filter refuses revoked tokens. Web sessions also use `BroadcastChannel` to clear sibling tabs. Mobile logout calls the same endpoint before local cleanup.
- File upload validation enforces a 10 MiB limit, approved extension/MIME pairing, and a small content signature check for supported binary formats.
- Login failures are limited to five attempts per username/IP key in a 15-minute window. The response is HTTP 429 with a generic message. Unexpected login errors no longer echo internal exception text.
- A bearer token is stored once per client: separately from user profile data in web `sessionStorage` and mobile AsyncStorage. Existing duplicated sessions are migrated when read.

## Functional and UI work

- Profile update responses include `phoneNumber`, allowing the profile UI to retain it.
- Payment search filters by payment number, order number, and receiver name.
- Quotation, payment, customer, and management navigation/routes follow the documented role policy on web and mobile.
- Customer controls have associated labels and validation metadata; the product-detail dialog traps Tab focus, supports Escape, and restores focus on close.
- Unknown front-end routes render a dedicated not-found screen.

## Verification

| Check | Result |
| --- | --- |
| Backend full suite | PASS — 193 tests, 0 failures, 0 errors. |
| Final authentication/security regression suite | PASS — 20 tests, 0 failures, 0 errors. |
| Mobile lint | PASS. |
| JavaScript syntax checks for changed auth files | PASS. |
| Diff whitespace check | PASS. |
| Live isolated QA checks | PASS for S01, S02, S03 and copied-token rejection after logout. |

## Remaining conditions and coverage gaps

1. **Login throttling was not rechecked live after the change.** Its unit/controller error-path coverage passes, but the QA server restart needed for a live 429 test was blocked by the local execution approval limit.
2. **The revocation denylist is in process memory.** It works in the verified single QA instance, but a process restart or multiple API nodes would not share revocations. Use a durable shared store before relying on immediate logout revocation across a production cluster.
3. **Order transition policy needs product approval.** Current tests intentionally allow several non-linear transitions, including `PENDING -> SHIPPED`; only cancelled orders are terminal. No approved state-transition matrix was found, so this behavior was documented rather than changed by inference.
4. **Warehouse dashboard access is retained.** The current role specification explicitly keeps the dashboard available to authenticated roles. It includes aggregate financial values, so product owners should confirm that this is still the intended warehouse-data policy.
5. **Front-end build and Node test execution could not run in this sandbox.** Vite/Node's test runner fails while spawning a child process with Windows `EPERM`. This is an environment limitation, not an assertion failure. Run the web build and payment-search test in CI or a normal developer shell.

## Release recommendation

**Ready with conditions.** The known high-impact authorization and data-exposure defects have remediation and passing backend verification. Before a multi-node production release, make revocation storage shared and durable, confirm the warehouse financial dashboard policy, and execute the blocked web build/test and live throttle checks in CI.
