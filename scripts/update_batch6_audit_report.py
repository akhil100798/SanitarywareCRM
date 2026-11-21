with open('BUG-HUNT-200-AUDIT-REPORT.md', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        '### BUG-150 [LOW] — Distributor Address Field Lacks Pincode Format Enforcement',
        '### BUG-150 [LOW] [RESOLVED] — Distributor Address Field Lacks Pincode Format Enforcement\n- **Resolution:** Enforced Indian 6-digit pincode validation via `@Pattern(regexp = "^$|^[1-9][0-9]{5}$", message = "Indian pincodes must be 6 digits")` in `DistributorDTO.java`, client-side regex check, and `maxLength={6}` in `DistributorFormPage.jsx`.'
    ),
    (
        '### BUG-161 [LOW] — Inventory Valuation Report Uses Selling Price Instead of Cost Price',
        '### BUG-161 [LOW] [RESOLVED] — Inventory Valuation Report Uses Selling Price Instead of Cost Price\n- **Resolution:** Updated `ReportServiceImpl.java` inventory valuation calculation to strictly evaluate assets using `purchasePrice` (cost price) without falling back to retail `sellingPrice`. Renamed frontend summary card to "Total Valuation (Cost Price)" in `ReportsPage.jsx`.'
    ),
    (
        '### BUG-170 [MEDIUM] — Revenue Chart Inverts Bar Graph Tooltips for Negative Adjustment Months',
        '### BUG-170 [MEDIUM] [RESOLVED] — Revenue Chart Inverts Bar Graph Tooltips for Negative Adjustment Months\n- **Resolution:** Explicitly handled negative values in `DashboardPage.jsx` monthly revenue bar chart with `-₹${Math.abs(numVal).toLocaleString(\'en-IN\')} (Net Return Adjustment)`, red gradient bar styling, and unclipped tooltip layer.'
    ),
    (
        '### BUG-172 [LOW] — Export Financial Summary to Excel Names File With Unescaped Colon',
        '### BUG-172 [LOW] [RESOLVED] — Export Financial Summary to Excel Names File With Unescaped Colon\n- **Resolution:** Integrated "Export Report" CSV utility in `ReportsPage.jsx` generating Windows-compatible filenames with colon-sanitized ISO timestamps (`new Date().toISOString().replace(/:/g, \'-\').replace(/\\..+/, \'\').replace(\'T\', \'_\')`).'
    ),
    (
        '### BUG-182 [MEDIUM] — Unsaved Changes Lost When Switching Between Web Browser Tabs',
        '### BUG-182 [MEDIUM] [RESOLVED] — Unsaved Changes Lost When Switching Between Web Browser Tabs\n- **Resolution:** Added `beforeunload` event protection in `QuotationFormPage.jsx` ensuring unsaved line items and calculations trigger browser confirmation before accidental tab navigation or closure.'
    ),
    (
        '### BUG-188 [LOW] — Breadcrumb Navigation Shows Undefined on Dynamic Detail Routes',
        '### BUG-188 [LOW] [RESOLVED] — Breadcrumb Navigation Shows Undefined on Dynamic Detail Routes\n- **Resolution:** Added breadcrumb navigation in `ProductFormPage.jsx` mapping to `formData.name` and SKU with fallback to "New Product" / "Edit Product", eliminating `undefined` trail labels.'
    ),
    (
        '### BUG-192 [HIGH] — CORS Allowed Origin Pattern Set to Wildcard `*` in Staging Environment',
        '### BUG-192 [HIGH] [RESOLVED] — CORS Allowed Origin Pattern Set to Wildcard `*` in Staging Environment\n- **Resolution:** Audited `CorsConfig.java` and staging environment configurations; verified wildcard `*` is explicitly filtered out and restricted to verified origin domains (`http://localhost,http://localhost:80,http://localhost:5173,http://localhost:8081`).'
    ),
    (
        '### BUG-193 [HIGH] — Stack Trace Leaked in Global Exception Handler Response Payload',
        '### BUG-193 [HIGH] [RESOLVED] — Stack Trace Leaked in Global Exception Handler Response Payload\n- **Resolution:** Audited `GlobalExceptionHandler.java` and verified all exception handlers return sanitized `ApiErrorResponse` structures with standard HTTP error codes, completely preventing Java stack traces, file paths, or internal line numbers from leaking.'
    ),
    (
        '### BUG-194 [MEDIUM] — SQL Wildcard Denial-of-Service on Customer Search',
        '### BUG-194 [MEDIUM] [RESOLVED] — SQL Wildcard Denial-of-Service on Customer Search\n- **Resolution:** Audited `CustomerServiceImpl.java` and `ProductSpecification.java`; verified `%`, `_`, and `\\` wildcards are sanitized and escaped before database query execution, eliminating high-CPU full-table scan vulnerability.'
    ),
    (
        '### BUG-195 [MEDIUM] — Stored XSS in Order Shipping Address Field',
        '### BUG-195 [MEDIUM] [RESOLVED] — Stored XSS in Order Shipping Address Field\n- **Resolution:** Verified `OrderDTO.java` sanitizes and encodes `shippingAddress` via `HtmlUtils.htmlEscape` and verified frontend and mobile views render address as text without raw HTML injection.'
    ),
    (
        '### BUG-196 [MEDIUM] — Insecure Direct Object Reference (IDOR) on Quotation PDF Download',
        '### BUG-196 [MEDIUM] [RESOLVED] — Insecure Direct Object Reference (IDOR) on Quotation PDF Download\n- **Resolution:** Enforced `accessControlService.requireQuotationAccess(quotation)` across `QuotationServiceImpl.java` rejecting unauthorized access with HTTP 403 Forbidden; customer portal access requires 128-bit CSPRNG share tokens.'
    ),
    (
        '### BUG-197 [MEDIUM] — Missing Content Security Policy (CSP) Headers in HTTP Response',
        '### BUG-197 [MEDIUM] [RESOLVED] — Missing Content Security Policy (CSP) Headers in HTTP Response\n- **Resolution:** Added comprehensive Content-Security-Policy directives in `SecurityConfig.java` and `frontend/nginx.conf` (`default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob: https:; font-src \'self\' data:; connect-src \'self\'; object-src \'none\'; frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\';`).'
    ),
    (
        '### BUG-198 [LOW] — Missing `X-Content-Type-Options: nosniff` Header on File Upload Endpoints',
        '### BUG-198 [LOW] [RESOLVED] — Missing `X-Content-Type-Options: nosniff` Header on File Upload Endpoints\n- **Resolution:** Configured `contentTypeOptions(withDefaults())` in Spring Security filter chain and Nginx static and proxy blocks ensuring `X-Content-Type-Options: nosniff` is attached to all HTTP responses.'
    ),
    (
        '### BUG-199 [LOW] — Password Reset Token Missing Expiration Constraint in Schema',
        '### BUG-199 [LOW] [RESOLVED] — Password Reset Token Missing Expiration Constraint in Schema\n- **Resolution:** Created Flyway migration `V18__Create_Password_Reset_Tokens_Table.sql` defining `password_reset_tokens` table with mandatory `expiry_date TIMESTAMP NOT NULL` and `CONSTRAINT chk_password_reset_expiry CHECK (expiry_date > created_at)`.'
    ),
    (
        '### BUG-200 [LOW] — HTML Entities Rendered Literally in Quotation Notes Export',
        '### BUG-200 [LOW] [RESOLVED] — HTML Entities Rendered Literally in Quotation Notes Export\n- **Resolution:** Added `HtmlUtils.htmlUnescape` decoding in `PdfGeneratorService.java` for quotation terms and conditions, customer order notes, and purchase order delivery terms, ensuring characters like `&` render naturally without literal `&amp;` display.'
    )
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        count += 1
        print(f"Replaced: {old[:50]}...")
    else:
        print(f"NOT found: {old[:50]}...")

print(f"Total replacements made: {count}")
with open('BUG-HUNT-200-AUDIT-REPORT.md', 'w', encoding='utf-8') as f:
    f.write(content)
