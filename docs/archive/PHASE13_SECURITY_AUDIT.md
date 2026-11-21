# SanitarywareCRM — Phase 13 Security & Penetration Audit Report

This report presents the findings of the comprehensive application-level security audit and penetration testing performed on SanitarywareCRM.

---

## 1. Security Scope & Assessment Matrix

| Vector | Target / Surface | Test Description | Finding | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Authentication** | `/api/auth/login` | Invalid password, empty payload, non-existent user | Rejected with HTTP 401 / 400; zero stack traces exposed | **PASS** |
| **JWT Integrity** | Bearer Header | Tampered payload, modified signature, expired token | Rejected with HTTP 401 Unauthorized by `JwtAuthenticationFilter` | **PASS** |
| **RBAC Authorization** | `@PreAuthorize` | Non-admin access to settings, user creation, or audit logs | Sales/Managers receive HTTP 403 Forbidden on restricted operations | **PASS** |
| **Privilege Escalation** | Claims manipulation | Modified role claim in JWT token body | Signature validation failure triggers immediate rejection (401) | **PASS** |
| **SQL Injection** | JPA / JPQL Queries | Malicious payloads in search inputs (`query`, `sku`, `name`) | Parameterized JPA criteria and prepared statements neutralize injection | **PASS** |
| **XSS Prevention** | React DOM Rendering | Script injection payloads (`<script>alert(1)</script>`) | React auto-escapes string interpolation; no `dangerouslySetInnerHTML` | **PASS** |
| **Path Traversal** | `/api/files/download` | Directory traversal sequences (`../../etc/passwd`) | `StringUtils.cleanPath` and `.startsWith(fileStorageLocation)` block traversal | **PASS** |
| **File Upload Spoofing** | `/api/files/upload` | Executable files (`.exe`, `.sh`, `.jsp`, `.php`) | Whitelist validation (`ALLOWED_EXTENSIONS`) rejects unapproved types | **PASS** |
| **Credential Leakage** | Logs & Responses | Audit events, user profile DTOs, console logs | Password hashes and JWTs excluded from user responses and audit logs | **PASS** |
| **CORS Policy** | Web Request Headers | Cross-origin requests from unapproved domains | Spring Security `CorsConfigurationSource` enforces origin whitelist | **PASS** |

---

## 2. In-Depth Security Verification Findings

### A. Authentication & JWT Hardening
- Algorithm: HMAC SHA-256 (`io.jsonwebtoken.security.Keys.hmacShaKeyFor`).
- Secret: Externalized via `JWT_SECRET` environment variable (minimum 256 bits).
- Session Management: Fully stateless (`SessionCreationPolicy.STATELESS`).

### B. Role-Based Access Control (RBAC) Matrix
- `ADMIN`: Permitted to manage users, update system settings, inspect audit logs, and perform full CRUD on products, customers, distributors, orders, and purchase orders.
- `MANAGER`: Permitted to manage catalog items, create/update orders, manage quotations, receive purchase orders, and view reports. Blocked from system settings and user administration.
- `SALES`: Permitted to browse catalog, create quotations, and view assigned orders. Blocked from product mutations, settings, distributor listings, audit logs, and financial reports.

### C. File Upload Security
- Filename Sanitization: Uploaded files are stored with random UUID identifiers (`UUID.randomUUID().toString() + extension`).
- Storage Location: Writable directory outside the web execution root (`FILE_UPLOAD_DIR`).
- Authorization: File uploads restricted to `ADMIN` and `MANAGER` roles via `@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")`.
