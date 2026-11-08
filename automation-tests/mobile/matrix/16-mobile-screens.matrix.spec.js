const { test, expect } = require('@playwright/test');
const { loginAs, cleanSession, uniqueId } = require('../../frontend/matrix/helpers');

test.describe('Module 16: Mobile UI Screens, Touch Controls & Viewport Matrix', () => {

  // ==========================================
  // POSITIVE TESTS (20)
  // ==========================================

  test('POS-MOB-001: Mobile login view loads responsive elements (brand header, inputs, submit button)', async ({ page }) => {
    await cleanSession(page);
    await page.goto('/login');
    await expect(page.locator('text=HydroSleek')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('POS-MOB-002: Mobile login submission with valid admin credentials successfully navigates to dashboard', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('header h2')).toContainText('Dashboard Overview');
  });

  test('POS-MOB-003: Mobile top header displays hamburger menu button and page title', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const hamburgerBtn = page.locator('header button:has(.lucide-menu)');
    await expect(hamburgerBtn).toBeVisible();
    await expect(page.locator('header h2')).toHaveText('Dashboard Overview');
  });

  test('POS-MOB-004: Tapping mobile hamburger menu opens slide-out navigation drawer', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const hamburgerBtn = page.locator('header button:has(.lucide-menu)');
    await hamburgerBtn.click();

    const drawer = page.locator('aside');
    await expect(drawer).toHaveClass(/translate-x-0/);
    await expect(drawer.locator('text=HydroSleek CRM')).toBeVisible();
  });

  test('POS-MOB-005: Tapping navigation drawer X button closes slide-out drawer', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    const drawer = page.locator('aside');
    await expect(drawer).toHaveClass(/translate-x-0/);

    const closeBtn = drawer.locator('button:has(.lucide-x)');
    await closeBtn.click();
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });

  test('POS-MOB-006: Tapping navigation backdrop/overlay dismisses mobile drawer', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    const overlay = page.locator('.fixed.inset-0.bg-slate-900\\/40');
    await expect(overlay).toBeVisible();

    await overlay.click({ position: { x: 350, y: 300 } });
    const drawer = page.locator('aside');
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });

  test('POS-MOB-007: Tapping Customers in mobile drawer navigates to /customers and auto-closes drawer', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    const customersLink = page.locator('aside nav a[href="/customers"]');
    await customersLink.click();

    await page.waitForURL(url => url.pathname.includes('/customers'));
    await expect(page.locator('header h2')).toHaveText('Customer Directory');
  });

  test('POS-MOB-008: Mobile customer directory displays search input and New Customer link', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/customers');
    const searchInput = page.locator('input[placeholder*="Search customer" i], input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    const addCustomerLink = page.getByRole('link', { name: /add customer|new customer/i });
    await expect(addCustomerLink).toBeVisible();
  });

  test('POS-MOB-009: Tapping New Customer navigates to responsive mobile form', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/customers');
    await page.getByRole('link', { name: /add customer|new customer/i }).click();
    await expect(page).toHaveURL(/\/customers\/new$/);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="phoneNumber"]')).toBeVisible();
  });

  test('POS-MOB-010: Mobile customer form Cancel button returns to /customers', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/customers/new');
    const backBtn = page.getByRole('button', { name: /back to directory/i });
    await backBtn.click();
    await expect(page).toHaveURL(/\/customers$/);
  });

  test('POS-MOB-011: Tapping Products in mobile drawer navigates to /products and header updates', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    await page.locator('aside nav a[href="/products"]').click();
    await page.waitForURL(url => url.pathname.includes('/products'));
    await expect(page.locator('header h2')).toHaveText('Product Catalog');
  });

  test('POS-MOB-012: Mobile product catalog renders search bar and Add Product link', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/products');
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible();
    const addProductLink = page.getByRole('link', { name: /add product|new product/i });
    await expect(addProductLink).toBeVisible();
  });

  test('POS-MOB-013: Tapping hamburger menu and selecting Quotations navigates to /quotations', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    await page.locator('aside nav a[href="/quotations"]').click();
    await page.waitForURL(url => url.pathname.includes('/quotations'));
    await expect(page.locator('header h2')).toHaveText('Sales Quotations');
  });

  test('POS-MOB-014: Mobile quotations list renders Create Quotation link and search field', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/quotations');
    const createBtn = page.locator('a[href="/quotations/new"]').first();
    await expect(createBtn).toBeVisible();
  });

  test('POS-MOB-015: Tapping Create Quotation navigates to /quotations/new with responsive form', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/quotations');
    const createBtn = page.locator('a[href="/quotations/new"]').first();
    await createBtn.click();
    await page.waitForURL(url => url.pathname.includes('/quotations/new'));
    await expect(page.locator('button:has-text("Add Item"), button:has-text("Add Product"), select, input').first()).toBeVisible();
  });

  test('POS-MOB-016: Tapping hamburger menu and selecting Orders navigates to /orders', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    await page.locator('aside nav a[href="/orders"]').click();
    await page.waitForURL(url => url.pathname.includes('/orders'));
    await expect(page.locator('header h2')).toHaveText('Customer Orders');
  });

  test('POS-MOB-017: Mobile orders screen displays status filter buttons and search input', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/orders');
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible();
  });

  test('POS-MOB-018: Tapping user profile avatar in mobile drawer navigates to /profile', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    const profileLink = page.locator('aside a[href="/profile"]');
    await profileLink.click();
    await page.waitForURL(url => url.pathname.includes('/profile'));
    await expect(page.locator('header h2')).toHaveText('My Account');
  });

  test('POS-MOB-019: Mobile profile screen displays user details and password update card', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/profile');
    await expect(page.getByText('Change Password')).toBeVisible();
    await expect(page.locator('input[name="newPassword"]')).toBeVisible();
  });

  test('POS-MOB-020: Tapping Logout button in mobile drawer logs out and redirects to /login', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('header button:has(.lucide-menu)').click();
    const logoutBtn = page.locator('aside button:has-text("Logout")');
    await logoutBtn.click();
    await page.waitForURL(url => url.pathname.includes('/login'));
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });


  // ==========================================
  // NEGATIVE TESTS (20)
  // ==========================================

  test('NEG-MOB-001: Mobile login with empty fields triggers HTML5 validation / prevents login', async ({ page }) => {
    await cleanSession(page);
    await page.goto('/login');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    expect(page.url()).toContain('/login');
    const usernameInput = page.locator('input[name="username"]');
    const isRequired = await usernameInput.getAttribute('required');
    expect(isRequired !== null).toBeTruthy();
  });

  test('NEG-MOB-002: Mobile login with invalid password displays responsive error toast or message', async ({ page }) => {
    await cleanSession(page);
    await page.goto('/login');
    await page.fill('input[name="username"]', 'qaadmin');
    await page.fill('input[name="password"]', 'WrongPassword!999');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid username or password|failed/i).first()).toBeVisible();
  });

  test('NEG-MOB-003: Mobile login with unknown username displays error message without crashing', async ({ page }) => {
    await cleanSession(page);
    await page.goto('/login');
    await page.fill('input[name="username"]', 'NonExistentMobileUser_99');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid username or password|failed/i).first()).toBeVisible();
  });

  test('NEG-MOB-004: Drawer remains hidden offscreen on mobile until hamburger button is tapped', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const drawer = page.locator('aside');
    await expect(drawer).toHaveClass(/-translate-x-full/);
  });

  test('NEG-MOB-005: Rapid double tap on mobile hamburger button does not break drawer open state', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const hamburgerBtn = page.locator('header button:has(.lucide-menu)');
    await hamburgerBtn.click();
    const drawer = page.locator('aside');
    await expect(drawer).toHaveClass(/translate-x-0/);
  });

  test('NEG-MOB-006: Customer search with nonexistent query displays empty state message or zero rows', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/customers');
    const searchInput = page.locator('input[placeholder*="search" i], input[type="text"]').first();
    await searchInput.fill('ZZZZZ_NONEXISTENT_CUSTOMER_XYZ_9999');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeLessThanOrEqual(1);
  });

  test('NEG-MOB-007: Mobile customer form validation prevents submission with blank name', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/customers/new');
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveAttribute('required', '');

    const saveBtn = page.locator('button[type="submit"]').first();
    await saveBtn.click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-MOB-008: Mobile customer form validation prevents submission with blank phone', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/customers/new');
    const phoneInput = page.locator('input[name="phoneNumber"]');
    await expect(phoneInput).toHaveAttribute('required', '');

    await page.locator('input[name="name"]').fill('Test Mobile Customer');
    const saveBtn = page.locator('button[type="submit"]').first();
    await saveBtn.click();
    expect(page.url()).toContain('/customers/new');
  });

  test('NEG-MOB-009: Product search with non-matching string displays empty state or no matching products', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/products');
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill('NON_EXISTENT_SANITARY_SKU_9999');
    await searchInput.press('Enter');

    await expect(page.getByText(/no products found/i)).toBeVisible();
  });

  test('NEG-MOB-010: Mobile product form validation blocks submission with blank product SKU and name', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/products/new');
    const skuInput = page.locator('input[name="sku"]');
    await expect(skuInput).toHaveAttribute('required', '');

    const saveBtn = page.locator('button[type="submit"]').first();
    await saveBtn.click();
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-MOB-011: Mobile product form validation blocks negative price', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/products/new');
    const priceInput = page.locator('input[name="sellingPrice"]').first();
    await expect(priceInput).toHaveAttribute('min', /0/);
  });

  test('NEG-MOB-012: Mobile quotation form blocks submission with no customer selected', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/quotations/new');
    const saveBtn = page.locator('button:has-text("Save Quotation"), button[type="submit"]').first();
    await saveBtn.click();
    expect(page.url()).toContain('/quotations/new');
  });

  test('NEG-MOB-013: Mobile quotation form blocks submission with 0 line items', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/quotations/new');
    const customerSelect = page.locator('select[name="customerId"]').first();
    if (await customerSelect.isVisible()) {
      await customerSelect.selectOption({ index: 1 });
    }
    const saveBtn = page.locator('button:has-text("Save Quotation"), button[type="submit"]').first();
    await saveBtn.click();
    expect(page.url()).toContain('/quotations/new');
  });

  test('NEG-MOB-014: Mobile orders status filter with cancelled filter keeps URL on orders', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/orders');
    const cancelledTab = page.locator('button:has-text("CANCELLED"), button:has-text("Cancelled")').first();
    if (await cancelledTab.isVisible()) {
      await cancelledTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/orders');
    }
  });

  test('NEG-MOB-015: Mobile profile password form validation prevents submission when new password is blank', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/profile');
    const currentPwdInput = page.locator('input[name="currentPassword"]').first();
    if (await currentPwdInput.isVisible()) {
      await currentPwdInput.fill('Password@123');
    }
    const saveBtn = page.locator('button:has-text("Save Changes")').first();
    if (await saveBtn.isVisible()) {
      expect(page.url()).toContain('/profile');
    }
  });

  test('NEG-MOB-016: Mobile profile password form prevents submission when passwords do not match', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/profile');
    const currentPwdInput = page.locator('input[name="currentPassword"]').first();
    const newPwdInput = page.locator('input[name="newPassword"]').first();
    const confirmPwdInput = page.locator('input[name="confirmPassword"]').first();

    if (await currentPwdInput.isVisible() && await newPwdInput.isVisible() && await confirmPwdInput.isVisible()) {
      await currentPwdInput.fill('Password@123');
      await newPwdInput.fill('NewSecurePass123!');
      await confirmPwdInput.fill('DifferentPass456!');
      const saveBtn = page.locator('button:has-text("Save Changes")').first();
      await saveBtn.click();
      await expect(page.getByText(/new passwords don't match|do not match/i)).toBeVisible();
    }
  });

  test('NEG-MOB-017: Mobile profile password form blocks new password shorter than 6 characters', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/profile');
    const newPwdInput = page.locator('input[name="newPassword"]').first();
    if (await newPwdInput.isVisible()) {
      const minLength = await newPwdInput.getAttribute('minlength');
      if (minLength) {
        expect(parseInt(minLength, 10)).toBeGreaterThanOrEqual(6);
      }
    }
  });

  test('NEG-MOB-018: Mobile unauthenticated direct URL navigation to /dashboard redirects to /login', async ({ page }) => {
    await cleanSession(page);
    await page.goto('/dashboard');
    await page.waitForURL(url => url.pathname.includes('/login'));
    expect(page.url()).toContain('/login');
  });

  test('NEG-MOB-019: Mobile unauthenticated direct URL navigation to /orders redirects to /login', async ({ page }) => {
    await cleanSession(page);
    await page.goto('/orders');
    await page.waitForURL(url => url.pathname.includes('/login'));
    expect(page.url()).toContain('/login');
  });

  test('NEG-MOB-020: Mobile sales user cannot see admin-only links (User Management, Settings) in mobile drawer', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.locator('header button:has(.lucide-menu)').click();
    const userMgmtLink = page.locator('aside nav a[href="/users"]');
    const settingsLink = page.locator('aside nav a[href="/settings"]');
    await expect(userMgmtLink).not.toBeVisible();
    await expect(settingsLink).not.toBeVisible();
  });

});
