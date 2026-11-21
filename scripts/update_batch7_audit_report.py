with open('BUG-HUNT-200-AUDIT-REPORT.md', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        '### BUG-037 [LOW] — Currency Display Uses Inconsistent Decimal Places (e.g., ₹250 vs ₹250.00)',
        '### BUG-037 [LOW] [RESOLVED] — Currency Display Uses Inconsistent Decimal Places (e.g., ₹250 vs ₹250.00)\n- **Resolution:** Enforced standard currency formatting with consistent 2 decimal places using `formatPrice` (`.toLocaleString(\'en-IN\', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`) across table view and multi-variant matrix view in `ProductListPage.jsx`.'
    ),
    (
        '### BUG-038 [LOW] — HSN Code Input Allows Arbitrary Alphanumeric Non-Standard Strings',
        '### BUG-038 [LOW] [RESOLVED] — HSN Code Input Allows Arbitrary Alphanumeric Non-Standard Strings\n- **Resolution:** Added `@Pattern(regexp = "^$|^[0-9]{4,8}$", message = "HSN code must be 4, 6, or 8 digits")` constraint in `ProductDTO.java` to enforce Indian GST HSN code standards.'
    ),
    (
        '### BUG-039 [LOW] — Unit Dropdown Allows Duplicate Custom Values (e.g., "piece", "Piece", "PIECE")',
        '### BUG-039 [LOW] [RESOLVED] — Unit Dropdown Allows Duplicate Custom Values (e.g., "piece", "Piece", "PIECE")\n- **Resolution:** Implemented normalization setter `setUnit(String unit)` in `ProductDTO.java` converting unit inputs to title case (e.g., "piece", "PIECE" -> "Piece"), preventing duplicate units in catalog queries.'
    ),
    (
        '### BUG-040 [LOW] — Color Attribute Allows Emoji Input (`🚿 Red`)',
        '### BUG-040 [LOW] [RESOLVED] — Color Attribute Allows Emoji Input (`🚿 Red`)\n- **Resolution:** Implemented `setColor(String color)` in `ProductDTO.java` stripping non-alphanumeric and emoji symbols, sanitizing color attributes before database persistence.'
    ),
    (
        '### BUG-042 [LOW] — Stock Status Badge Inverts Low-Stock Color Scheme',
        '### BUG-042 [LOW] [RESOLVED] — Stock Status Badge Inverts Low-Stock Color Scheme\n- **Resolution:** Updated stock badge styling in `ProductListPage.jsx` mapping `stockQuantity <= 0` to rose Out of Stock, `stockQuantity <= reorderLevel` to amber Low Stock with warning icon, and active inventory to emerald In Stock.'
    ),
    (
        '### BUG-044 [LOW] — Product Matrix View Card Titles Truncate Abruptly Without Tooltip',
        '### BUG-044 [LOW] [RESOLVED] — Product Matrix View Card Titles Truncate Abruptly Without Tooltip\n- **Resolution:** Added `title={family.baseName || activeProduct.name}` and SKU `title={activeProduct.sku}` tooltips to Product Matrix view cards in `ProductListPage.jsx`.'
    ),
    (
        '### BUG-045 [LOW] — Empty Product Catalog Displays Raw JSON Null Instead of Illustration',
        '### BUG-045 [LOW] [RESOLVED] — Empty Product Catalog Displays Raw JSON Null Instead of Illustration\n- **Resolution:** Added friendly empty state card with Package icon, informative description, and "Clear all filters" reset button in both Table View and Matrix View in `ProductListPage.jsx`.'
    ),
    (
        '### BUG-056 [MEDIUM] — Editing Customer Name Does Not Update Cached Name on Open Quotations',
        '### BUG-056 [MEDIUM] [RESOLVED] — Editing Customer Name Does Not Update Cached Name on Open Quotations\n- **Resolution:** Verified `QuotationMapper` joins dynamically via `@ManyToOne` on `Customer` (`dto.setCustomerName(quotation.getCustomer().getName())`), ensuring customer name edits immediately propagate to quotation lists and details without stale de-normalized caches.'
    ),
    (
        '### BUG-059 [LOW] — Customer Table Pagination Resets to Page 1 on Row Status Toggle',
        '### BUG-059 [LOW] [RESOLVED] — Customer Table Pagination Resets to Page 1 on Row Status Toggle\n- **Resolution:** Added pagination states (`currentPage`, `pageSize`, `totalPages`, `totalElements`) and pagination navigation controls in `CustomerListPage.jsx`, preserving `currentPage` when toggling or deactivating customers (`fetchCustomers(currentPage)`).'
    ),
    (
        '### BUG-063 [LOW] — Customer Export to CSV Escapes Commas Incorrectly',
        '### BUG-063 [LOW] [RESOLVED] — Customer Export to CSV Escapes Commas Incorrectly\n- **Resolution:** Implemented RFC 4180 compliant CSV export in `CustomerListPage.jsx` (`escapeCsvCell` wrapping text in double quotes with `""` escape), preventing addresses containing commas (`"Plot 12, Phase 1, Industrial Area"`) from misaligning CSV columns.'
    ),
    (
        '### BUG-064 [LOW] — Customer Card Displays "NaN" for Credit Limit When Unset',
        '### BUG-064 [LOW] [RESOLVED] — Customer Card Displays "NaN" for Credit Limit When Unset\n- **Resolution:** Added safe fallback formatting in `CustomerListPage.jsx` profile drawer and CSV export (`customer.creditLimit != null && !isNaN(Number(customer.creditLimit)) ? ... : "No limit set"`), completely eliminating `₹NaN` display.'
    ),
    (
        '### BUG-077 [MEDIUM] — Dynamic Grand Total Calculation Fails When Quantity Input Is Cleared',
        '### BUG-077 [MEDIUM] [RESOLVED] — Dynamic Grand Total Calculation Fails When Quantity Input Is Cleared\n- **Resolution:** Updated `handleItemChange` and input binding in `QuotationFormPage.jsx` to gracefully handle empty string inputs without flashing `NaN` or failing line-total calculations during rapid editing.'
    ),
    (
        '### BUG-080 [LOW] — Quotation Status Badge for "SENT" Uses Confusing Red Warning Color',
        '### BUG-080 [LOW] [RESOLVED] — Quotation Status Badge for "SENT" Uses Confusing Red Warning Color\n- **Resolution:** Mapped `SENT` quotation status badge explicitly to `bg-blue-50 text-blue-700 border-blue-100` in `QuotationListPage.jsx`, distinguishing dispatched quotes from expired or rejected states.'
    ),
    (
        '### BUG-082 [LOW] — Re-ordering Line Items Erases Newly Typed Unsaved Notes',
        '### BUG-082 [LOW] [RESOLVED] — Re-ordering Line Items Erases Newly Typed Unsaved Notes\n- **Resolution:** Implemented `moveItem` with immutable array swapping in `QuotationFormPage.jsx`, preserving entire line item object references, unsaved notes, transient inputs, and discounts when clicking Move Up / Move Down buttons.'
    ),
    (
        '### BUG-083 [LOW] — WhatsApp Share URL Encodes Spaces as `+` Instead of `%20`',
        '### BUG-083 [LOW] [RESOLVED] — WhatsApp Share URL Encodes Spaces as `+` Instead of `%20`\n- **Resolution:** Verified and enforced `encodeURIComponent(messageText)` in `ShareWhatsAppModal.jsx` and WhatsApp dispatch links, guaranteeing standard `%20` encoding across web and mobile WhatsApp clients.'
    ),
    (
        '### BUG-085 [LOW] — Deleting All Line Items Leaves Table Header Floating Above Empty Card',
        '### BUG-085 [LOW] [RESOLVED] — Deleting All Line Items Leaves Table Header Floating Above Empty Card\n- **Resolution:** Replaced awkward empty table headers in `QuotationFormPage.jsx` with a friendly empty state illustration card and prominent "Add Line Item" button when all items are cleared.'
    )
]

count = 0
for target, replacement in replacements:
    if target in content:
        content = content.replace(target, replacement, 1)
        count += 1
    else:
        print(f"NOT FOUND: {target[:40]}")

with open('BUG-HUNT-200-AUDIT-REPORT.md', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully updated {count} defects in BUG-HUNT-200-AUDIT-REPORT.md")
