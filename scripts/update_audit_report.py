import re

with open('BUG-HUNT-200-AUDIT-REPORT.md', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        '### BUG-155 [MEDIUM] — Reorder Alert Notification Fires Multiple Times for Same SKU',
        '### BUG-155 [MEDIUM] [RESOLVED] — Reorder Alert Notification Fires Multiple Times for Same SKU\n- **Resolution:** Grouped and deduplicated low-stock alert notifications and reorder suggestions by `productId` using `LinkedHashMap<Long, LowStockAlertDTO>` and `LinkedHashMap<Long, ReorderSuggestionDTO>` in `InventoryAnalyticsServiceImpl.java`. Verified that repeated evaluations only retain a single canonical alert per SKU.'
    ),
    (
        '### BUG-169 [MEDIUM] — Date Range Filter "This Month" Fails on Month Boundary Leap Years',
        '### BUG-169 [MEDIUM] [RESOLVED] — Date Range Filter "This Month" Fails on Month Boundary Leap Years\n- **Resolution:** Replaced error-prone manual `withDayOfMonth` arithmetic in `DashboardServiceImpl.java` with calendar-aware `TemporalAdjusters.firstDayOfMonth()` and `TemporalAdjusters.lastDayOfMonth()`, correctly handling leap-year February boundaries.'
    ),
    (
        '### BUG-177 [HIGH] — Infinite Loading Spinner When API Endpoint Throws Network Error',
        '### BUG-177 [HIGH] [RESOLVED] — Infinite Loading Spinner When API Endpoint Throws Network Error\n- **Resolution:** Added dedicated error state tracking with inline alert banner ("Network disconnected. Please check your internet connection.") and actionable `<button onClick={fetchData}><RotateCcw /> Retry</button>` across `CustomerListPage.jsx`, `QuotationListPage.jsx`, and `OrderListPage.jsx`, eliminating infinite loading spinners.'
    ),
    (
        '### BUG-180 [MEDIUM] — Toast Notification Stacks Accumulate Off-Screen Without Dismiss Button',
        '### BUG-180 [MEDIUM] [RESOLVED] — Toast Notification Stacks Accumulate Off-Screen Without Dismiss Button\n- **Resolution:** Integrated `<ToastLimiter limit={3} />` using `useToasterStore` from `react-hot-toast` in `frontend/src/App.jsx` with an explicit close button (`<X size={14} />`) and click-to-dismiss behavior.'
    ),
    (
        '### BUG-181 [MEDIUM] — Slow 3G Network Throttling Causes Form Timeout Without Retry Prompt',
        '### BUG-181 [MEDIUM] [RESOLVED] — Slow 3G Network Throttling Causes Form Timeout Without Retry Prompt\n- **Resolution:** Added `onUploadProgress` callback tracking to `previewCatalogUploadAsync` in `BulkUploadModal.jsx` and `productService.js`, increased Axios timeout to 180s, and rendered a retry banner on timeout error.'
    ),
    (
        '### BUG-186 [LOW] — Textarea Elements Lack Vertical Resize Limit',
        '### BUG-186 [LOW] [RESOLVED] — Textarea Elements Lack Vertical Resize Limit\n- **Resolution:** Enforced global CSS rule `textarea { resize: vertical; max-height: 16rem; min-height: 4.5rem; }` in `frontend/src/index.css` restricting arbitrary drag overflow.'
    ),
    (
        '### BUG-190 [LOW] — Table Search Clear Button (X) Appears Even When Input Is Empty',
        '### BUG-190 [LOW] [RESOLVED] — Table Search Clear Button (X) Appears Even When Input Is Empty\n- **Resolution:** Added conditional rendering (`searchQuery && searchQuery.length > 0`) for the search input clear (`X`) button across Customer, Quotation, Order, Product, Brand, Category, Distributor, Purchase Order, and Payment list views.'
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
