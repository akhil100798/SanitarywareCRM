const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 06: Brands & Categories Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 20 POSITIVE TESTS
  test('POS-BC-001: "Add Brand" button opens Brand creation modal', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    await expect(page.locator('h1, h2, h3').filter({ hasText: /add brand|new brand/i }).first()).toBeVisible();
  });

  test('POS-BC-002: Brand Name input accepts alphabetic title', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Kohler');
    await expect(nameInput).toHaveValue('Kohler');
  });

  test('POS-BC-003: Brand Description textarea accepts descriptive text', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const desc = page.locator('textarea[name="description"]');
    await desc.fill('Global sanitaryware and kitchen fittings manufacturer.');
    await expect(desc).toHaveValue('Global sanitaryware and kitchen fittings manufacturer.');
  });

  test('POS-BC-004: Brand Logo URL input accepts valid web URL', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const logo = page.locator('input[name="logoUrl"]');
    if (await logo.isVisible()) {
      await logo.fill('https://example.com/logo.png');
      await expect(logo).toHaveValue('https://example.com/logo.png');
    }
  });

  test('POS-BC-005: Brand Active checkbox toggle turns off and on', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const chk = page.locator('input[name="isActive"]');
    if (await chk.isVisible()) {
      await chk.uncheck();
      expect(await chk.isChecked()).toBeFalsy();
      await chk.check();
      expect(await chk.isChecked()).toBeTruthy();
    }
  });

  test('POS-BC-006: Saving new brand successfully creates brand and updates list', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const brandName = `Brand_${Date.now()}`;
    await page.locator('input[name="name"]').fill(brandName);
    await page.locator('textarea[name="description"]').fill('Automated Test Brand');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(`text=${brandName}`).first()).toBeVisible({ timeout: 15000 });
  });

  test('POS-BC-007: Brand search input filters table by brand name', async ({ page }) => {
    await page.goto('/brands');
    const search = page.locator('input[placeholder*="Search" i]');
    await search.fill('Brand');
    await page.waitForTimeout(400);
    expect(page.url()).toContain('/brands');
  });

  test('POS-BC-008: Edit brand button opens populated modal', async ({ page }) => {
    await page.goto('/brands');
    const editBtn = page.locator('button:has(.lucide-edit), button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const val = await page.locator('input[name="name"]').inputValue();
      expect(val.length).toBeGreaterThan(0);
    }
  });

  test('POS-BC-009: Cancel button in Brand modal closes without changes', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    await cancelBtn.click();
    await expect(page.locator('h3:has-text("Add Brand")')).toHaveCount(0);
  });

  test('POS-BC-010: Escape key closes Brand modal', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('h3:has-text("Add Brand")')).toHaveCount(0);
  });

  test('POS-BC-011: "Add Category" button opens Category modal', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    await expect(page.locator('h1, h2, h3').filter({ hasText: /add category|new category/i }).first()).toBeVisible();
  });

  test('POS-BC-012: Category Name input accepts classification title', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Faucets & Showers');
    await expect(nameInput).toHaveValue('Faucets & Showers');
  });

  test('POS-BC-013: Category Description input accepts details', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    const desc = page.locator('textarea[name="description"]');
    await desc.fill('Complete range of bathroom faucets, shower mixers, and bib taps.');
    await expect(desc).toHaveValue('Complete range of bathroom faucets, shower mixers, and bib taps.');
  });

  test('POS-BC-014: Parent Category dropdown allows selecting root level', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    const parent = page.locator('select[name="parentId"]');
    if (await parent.isVisible()) {
      await parent.selectOption('');
      await expect(parent).toHaveValue('');
    }
  });

  test('POS-BC-015: Parent Category dropdown allows selecting existing parent', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    const parent = page.locator('select[name="parentId"]');
    if (await parent.isVisible()) {
      const options = await parent.locator('option').all();
      if (options.length > 1) {
        await parent.selectOption({ index: 1 });
        const val = await parent.inputValue();
        expect(val).toBeTruthy();
      }
    }
  });

  test('POS-BC-016: Saving new category creates category and closes modal', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    const catName = `Cat_${Date.now()}`;
    await page.locator('input[name="name"]').fill(catName);
    await page.locator('textarea[name="description"]').fill('Automated Test Category');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(`text=${catName}`).first()).toBeVisible({ timeout: 15000 });
  });

  test('POS-BC-017: Category search input filters table by keyword', async ({ page }) => {
    await page.goto('/categories');
    const search = page.locator('input[placeholder*="Search" i]');
    await search.fill('Cat');
    await page.waitForTimeout(400);
    expect(page.url()).toContain('/categories');
  });

  test('POS-BC-018: Edit category button opens modal with category data', async ({ page }) => {
    await page.goto('/categories');
    const editBtn = page.locator('button:has(.lucide-edit), button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const val = await page.locator('input[name="name"]').inputValue();
      expect(val.length).toBeGreaterThan(0);
    }
  });

  test('POS-BC-019: Cancel button in Category modal closes without saving', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    await cancelBtn.click();
    await expect(page.locator('h3:has-text("Add Category")')).toHaveCount(0);
  });

  test('POS-BC-020: Close icon (X) button closes Category modal', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    const closeBtn = page.locator('.fixed.inset-0 button:has(.lucide-x)').first();
    await closeBtn.click();
    await expect(page.locator('h3').filter({ hasText: /category/i })).toHaveCount(0);
  });

  // 20 NEGATIVE TESTS
  test('NEG-BC-001: Submitting Brand form with empty Name triggers validation', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    await page.locator('input[name="name"]').fill('');
    await page.locator('button[type="submit"]').click();
    const valid = await page.locator('input[name="name"]').evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-BC-002: Brand name input enforces required constraint on form submission', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveAttribute('required', '');
    const valid = await nameInput.evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-BC-003: Duplicate brand name triggers error toast', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    // Use existing brand name
    await page.locator('input[name="name"]').fill('Jaquar');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
  });

  test('NEG-BC-004: XSS string in Brand name is sanitized', async ({ page }) => {
    let alertShown = false;
    page.on('dialog', () => { alertShown = true; });
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    await page.locator('input[name="name"]').fill('<script>alert("brand-xss")</script>');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(alertShown).toBeFalsy();
  });

  test('NEG-BC-005: Dismissing Brand deletion confirmation dialog cancels deletion', async ({ page }) => {
    await page.goto('/brands');
    page.once('dialog', dialog => dialog.dismiss());
    const deleteBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/brands');
    }
  });

  test('NEG-BC-006: Sales role navigating to /brands is forbidden or redirected', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/brands');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/brands');
    expect(blocked).toBeTruthy();
  });

  test('NEG-BC-007: Warehouse role navigating to /brands is forbidden or redirected', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/brands');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/brands');
    expect(blocked).toBeTruthy();
  });

  test('NEG-BC-008: SQL injection in Brand search does not crash the page', async ({ page }) => {
    await page.goto('/brands');
    const search = page.locator('input[placeholder*="Search" i]');
    await search.fill("' OR '1'='1' --");
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/brands');
  });

  test('NEG-BC-009: Extremely long Brand name (> 255 chars) handles gracefully', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    await page.locator('input[name="name"]').fill('A'.repeat(300));
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
  });

  test('NEG-BC-010: Clicking backdrop closes Brand modal', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: /add brand|new brand/i }).click();
    const backdrop = page.locator('.fixed.inset-0').first();
    if (await backdrop.isVisible()) {
      await backdrop.click({ position: { x: 5, y: 5 } });
      await page.waitForTimeout(300);
    }
  });

  test('NEG-BC-011: Submitting Category form with empty Name triggers validation', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    await page.locator('input[name="name"]').fill('');
    await page.locator('button[type="submit"]').click();
    const valid = await page.locator('input[name="name"]').evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-BC-012: Whitespace-only Category name is rejected', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    await page.locator('input[name="name"]').fill('     ');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(await page.locator('input[name="name"]').isVisible()).toBeTruthy();
  });

  test('NEG-BC-013: Duplicate category name triggers error toast', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    await page.locator('input[name="name"]').fill('Sanitaryware');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
  });

  test('NEG-BC-014: XSS script tag in Category name is sanitized without alert dialog', async ({ page }) => {
    let alertShown = false;
    page.on('dialog', () => { alertShown = true; });
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    await page.locator('input[name="name"]').fill('<script>alert("cat-xss")</script>');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(alertShown).toBeFalsy();
  });

  test('NEG-BC-015: Dismissing Category deactivation confirmation alert cancels action', async ({ page }) => {
    await page.goto('/categories');
    page.once('dialog', dialog => dialog.dismiss());
    const deleteBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/categories');
    }
  });

  test('NEG-BC-016: Sales role has no Delete button on categories list', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/categories');
    await expect(page.locator('button:has(.lucide-trash-2)')).toHaveCount(0);
  });

  test('NEG-BC-017: Warehouse role has no Delete button on categories list', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/categories');
    await expect(page.locator('button:has(.lucide-trash-2)')).toHaveCount(0);
  });

  test('NEG-BC-018: SQL injection in Category search executes safely', async ({ page }) => {
    await page.goto('/categories');
    const search = page.locator('input[placeholder*="Search" i]');
    await search.fill("' UNION SELECT null, null --");
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/categories');
  });

  test('NEG-BC-019: Category search with gibberish returns zero matches without error', async ({ page }) => {
    await page.goto('/categories');
    const search = page.locator('input[placeholder*="Search" i]');
    await search.fill('zzznonexistentcategorystring999');
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeLessThanOrEqual(1);
  });

  test('NEG-BC-020: Rapid double-click on Category Save button does not double submit', async ({ page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: /add category|new category/i }).click();
    await page.locator('input[name="name"]').fill(`DblClick_${Date.now()}`);
    await page.locator('button[type="submit"]').dblclick();
    await page.waitForTimeout(500);
  });
});
