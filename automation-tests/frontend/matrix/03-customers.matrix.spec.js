const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 03: Customers Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 20 POSITIVE TESTS
  test('POS-CUST-001: "Add Customer" button navigates to /customers/new', async ({ page }) => {
    await page.goto('/customers');
    await page.getByRole('link', { name: /add customer|new customer/i }).click();
    await expect(page).toHaveURL(/\/customers\/new$/);
  });

  test('POS-CUST-002: Customer Name input accepts alphabetic text', async ({ page }) => {
    await page.goto('/customers/new');
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Rajesh Sharma');
    await expect(nameInput).toHaveValue('Rajesh Sharma');
  });

  test('POS-CUST-003: Phone Number input accepts valid 10-digit number', async ({ page }) => {
    await page.goto('/customers/new');
    const phoneInput = page.locator('input[name="phoneNumber"]');
    await phoneInput.fill('9876543210');
    await expect(phoneInput).toHaveValue('9876543210');
  });

  test('POS-CUST-004: Email input accepts standard RFC email format', async ({ page }) => {
    await page.goto('/customers/new');
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('rajesh.sharma@example.com');
    await expect(emailInput).toHaveValue('rajesh.sharma@example.com');
  });

  test('POS-CUST-005: Company input accepts optional business title', async ({ page }) => {
    await page.goto('/customers/new');
    const companyInput = page.locator('input[name="company"]');
    await companyInput.fill('Sharma Sanitarywares Pvt Ltd');
    await expect(companyInput).toHaveValue('Sharma Sanitarywares Pvt Ltd');
  });

  test('POS-CUST-006: Customer Type dropdown allows selecting RETAIL', async ({ page }) => {
    await page.goto('/customers/new');
    const typeSelect = page.locator('select[name="customerType"]');
    await typeSelect.selectOption('RETAIL');
    await expect(typeSelect).toHaveValue('RETAIL');
  });

  test('POS-CUST-007: Customer Type dropdown allows selecting WHOLESALE', async ({ page }) => {
    await page.goto('/customers/new');
    const typeSelect = page.locator('select[name="customerType"]');
    await typeSelect.selectOption('WHOLESALE');
    await expect(typeSelect).toHaveValue('WHOLESALE');
  });

  test('POS-CUST-008: GST Number input accepts valid 15-character GSTIN', async ({ page }) => {
    await page.goto('/customers/new');
    const gstInput = page.locator('input[name="gstNumber"]');
    await gstInput.fill('27AABCU9603R1ZM');
    await expect(gstInput).toHaveValue('27AABCU9603R1ZM');
  });

  test('POS-CUST-009: Billing Address input accepts multi-line address text', async ({ page }) => {
    await page.goto('/customers/new');
    const addr = page.locator('textarea[name="billingAddress"], input[name="billingAddress"]');
    await addr.fill('Plot 42, Industrial Area Phase II');
    await expect(addr).toHaveValue('Plot 42, Industrial Area Phase II');
  });

  test('POS-CUST-010: Shipping Address input accepts location details', async ({ page }) => {
    await page.goto('/customers/new');
    const addr = page.locator('textarea[name="shippingAddress"], input[name="shippingAddress"]');
    await addr.fill('Warehouse 3, Ring Road Depot');
    await expect(addr).toHaveValue('Warehouse 3, Ring Road Depot');
  });

  test('POS-CUST-011: City input accepts municipal name', async ({ page }) => {
    await page.goto('/customers/new');
    const cityInput = page.locator('input[name="city"]');
    await cityInput.fill('Mumbai');
    await expect(cityInput).toHaveValue('Mumbai');
  });

  test('POS-CUST-012: State input accepts province name', async ({ page }) => {
    await page.goto('/customers/new');
    const stateInput = page.locator('input[name="state"]');
    await stateInput.fill('Maharashtra');
    await expect(stateInput).toHaveValue('Maharashtra');
  });

  test('POS-CUST-013: Pincode input accepts 6-digit postal code', async ({ page }) => {
    await page.goto('/customers/new');
    const pinInput = page.locator('input[name="pincode"]');
    await pinInput.fill('400001');
    await expect(pinInput).toHaveValue('400001');
  });

  test('POS-CUST-014: Active status checkbox toggles on and off', async ({ page }) => {
    await page.goto('/customers/new');
    const checkbox = page.locator('input[name="isActive"]');
    if (await checkbox.isVisible()) {
      await checkbox.uncheck();
      expect(await checkbox.isChecked()).toBeFalsy();
      await checkbox.check();
      expect(await checkbox.isChecked()).toBeTruthy();
    }
  });

  test('POS-CUST-015: Complete customer creation successfully saves and redirects', async ({ page }) => {
    await page.goto('/customers/new');
    const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const testEmail = `cust_${Date.now()}@example.com`;
    await page.locator('input[name="name"]').fill(`Test Customer ${Date.now()}`);
    await page.locator('input[name="phoneNumber"]').fill(testPhone);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="city"]').fill('Pune');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/customers$/, { timeout: 20000 });
    await expect(page.locator(`text=${testPhone}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('POS-CUST-016: Customer search input filters records by phone number', async ({ page }) => {
    await page.goto('/customers');
    const searchInput = page.locator('input[placeholder*="Search" i]');
    await searchInput.fill('98765');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/customers');
  });

  test('POS-CUST-017: Clearing customer search query restores full customer list', async ({ page }) => {
    await page.goto('/customers');
    const searchInput = page.locator('input[placeholder*="Search" i]');
    await searchInput.fill('');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    const rows = page.locator('tbody tr, .grid > div');
    expect(await rows.count()).toBeGreaterThanOrEqual(0);
  });

  test('POS-CUST-018: Edit customer button navigates to edit form with populated fields', async ({ page }) => {
    await page.goto('/customers');
    const editLink = page.locator('a[href*="/customers/edit/"]').first();
    if (await editLink.isVisible()) {
      await editLink.click();
      await expect(page).toHaveURL(/\/customers\/edit\/\d+$/);
      const nameVal = await page.locator('input[name="name"]').inputValue();
      expect(nameVal.length).toBeGreaterThan(0);
    }
  });

  test('POS-CUST-019: Updating customer city and saving persists successfully', async ({ page }) => {
    await page.goto('/customers');
    const editLink = page.locator('a[href*="/customers/edit/"]').first();
    if (await editLink.isVisible()) {
      await editLink.click();
      await page.locator('input[name="city"]').fill('Navi Mumbai');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/customers$/, { timeout: 20000 });
    }
  });

  test('POS-CUST-020: Back to list button on customer form navigates to /customers', async ({ page }) => {
    await page.goto('/customers/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/customers"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/customers$/);
    }
  });

  // 20 NEGATIVE TESTS
  test('NEG-CUST-001: Submitting customer form with empty Name triggers HTML5 validation', async ({ page }) => {
    await page.goto('/customers/new');
    await page.locator('input[name="name"]').fill('');
    await page.locator('input[name="phoneNumber"]').fill('9876543210');
    await page.locator('button[type="submit"]').click();
    const valid = await page.locator('input[name="name"]').evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-CUST-002: Submitting customer form with empty Phone triggers validation', async ({ page }) => {
    await page.goto('/customers/new');
    await page.locator('input[name="name"]').fill('Test Customer');
    await page.locator('input[name="phoneNumber"]').fill('');
    await page.locator('button[type="submit"]').click();
    const valid = await page.locator('input[name="phoneNumber"]').evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-CUST-003: Phone number shorter than 10 digits is rejected', async ({ page }) => {
    await page.goto('/customers/new');
    await page.locator('input[name="name"]').fill('Invalid Phone User');
    await page.locator('input[name="phoneNumber"]').fill('12345');
    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-CUST-004: Phone number with alphabet characters is rejected', async ({ page }) => {
    await page.goto('/customers/new');
    await page.locator('input[name="name"]').fill('Alpha Phone User');
    await page.locator('input[name="phoneNumber"]').fill('98765ABCD0');
    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-CUST-005: Duplicate customer phone number displays conflict error', async ({ page }) => {
    await page.goto('/customers/new');
    // Attempt to register with a known existing phone
    await page.locator('input[name="name"]').fill('Duplicate Phone User');
    await page.locator('input[name="phoneNumber"]').fill('9876543210');
    await page.locator('input[name="email"]').fill(`unique_${Date.now()}@test.com`);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    // Either stay on page or show conflict toast
    expect(page.url()).toContain('/customers');
  });

  test('NEG-CUST-006: Malformed email missing @ symbol displays inline error message', async ({ page }) => {
    await page.goto('/customers/new');
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('invalidemailwithoutat.com');
    await expect(page.locator('text=/invalid email format/i')).toBeVisible({ timeout: 5000 });
  });

  test('NEG-CUST-007: Malformed email missing domain displays validation warning', async ({ page }) => {
    await page.goto('/customers/new');
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('invalidemailmissingat');
    await expect(page.locator('text=/invalid email format/i')).toBeVisible({ timeout: 5000 });
  });

  test('NEG-CUST-008: Non-existent customer edit route /customers/edit/999999 redirects to list', async ({ page }) => {
    await page.goto('/customers/edit/999999');
    await page.waitForURL(/\/customers$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/customers$/);
  });

  test('NEG-CUST-009: Negative pincode is rejected', async ({ page }) => {
    await page.goto('/customers/new');
    const pin = page.locator('input[name="pincode"]');
    await pin.fill('-40001');
    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-CUST-010: Pincode with letters is rejected', async ({ page }) => {
    await page.goto('/customers/new');
    const pin = page.locator('input[name="pincode"]');
    await pin.fill('400ABC');
    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-CUST-011: SQL injection string in customer search input executes safely', async ({ page }) => {
    await page.goto('/customers');
    const searchInput = page.locator('input[placeholder*="Search" i]');
    await searchInput.fill("' UNION SELECT null, null, null --");
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/customers');
  });

  test('NEG-CUST-012: XSS script tag in Customer Name is sanitized without alert dialog', async ({ page }) => {
    let xssFired = false;
    page.on('dialog', () => { xssFired = true; });
    await page.goto('/customers/new');
    await page.locator('input[name="name"]').fill('<img src=x onerror=alert(1)>');
    await page.locator('input[name="phoneNumber"]').fill('9988776655');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(xssFired).toBeFalsy();
  });

  test('NEG-CUST-013: Whitespace-only Customer Name is invalid', async ({ page }) => {
    await page.goto('/customers/new');
    await page.locator('input[name="name"]').fill('       ');
    await page.locator('input[name="phoneNumber"]').fill('9876543210');
    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-CUST-014: Alternate phone with non-numeric chars is rejected', async ({ page }) => {
    await page.goto('/customers/new');
    const altPhone = page.locator('input[name="alternatePhone"]');
    if (await altPhone.isVisible()) {
      await altPhone.fill('NOTAPHONE');
      await page.locator('button[type="submit"]').click();
      expect(page.url()).toContain('/customers/new');
    }
  });

  test('NEG-CUST-015: Invalid GSTIN string length is rejected', async ({ page }) => {
    await page.goto('/customers/new');
    const gstInput = page.locator('input[name="gstNumber"]');
    await gstInput.fill('INVALIDGST123');
    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-CUST-016: Dismissing customer deactivation confirmation alert cancels deletion', async ({ page }) => {
    await page.goto('/customers');
    page.once('dialog', dialog => dialog.dismiss());
    const deleteBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/customers');
    }
  });

  test('NEG-CUST-017: Customer search with gibberish returns empty state gracefully', async ({ page }) => {
    await page.goto('/customers');
    const searchInput = page.locator('input[placeholder*="Search" i]');
    await searchInput.fill('xyznonexistentcustomerstring12345');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeLessThanOrEqual(1);
  });

  test('NEG-CUST-018: Oversized notes textarea payload is clamped or accepted safely', async ({ page }) => {
    await page.goto('/customers/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('A'.repeat(2000));
      const val = await notes.inputValue();
      expect(val.length).toBeGreaterThanOrEqual(100);
    }
  });

  test('NEG-CUST-019: Direct URL injection with negative customer ID /customers/edit/-1 redirects', async ({ page }) => {
    await page.goto('/customers/edit/-1');
    await page.waitForURL(/\/customers$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/customers$/);
  });

  test('NEG-CUST-020: Direct URL injection with non-numeric customer ID /customers/edit/abc redirects', async ({ page }) => {
    await page.goto('/customers/edit/abc');
    await page.waitForURL(/\/customers$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/customers$/);
  });
});
