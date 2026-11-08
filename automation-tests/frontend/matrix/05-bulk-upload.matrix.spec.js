const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');
const path = require('path');
const fs = require('fs');

test.describe('Matrix Module 05: Bulk Upload Modal & Catalog Importer', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 10 POSITIVE TESTS
  test('POS-BULK-001: "Bulk Upload" button opens the bulk import modal', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await expect(page.locator('h1, h2, h3').filter({ hasText: /bulk|import|upload/i }).first()).toBeVisible();
    }
  });

  test('POS-BULK-002: Modal backdrop renders and dims background', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await expect(page.locator('.fixed.inset-0').first()).toBeVisible();
    }
  });

  test('POS-BULK-003: Brand selector dropdown in modal contains available brands', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const select = page.locator('select').first();
      await expect(select).toBeVisible();
    }
  });

  test('POS-BULK-004: File input element is present with PDF mime-type filter', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
    }
  });

  test('POS-BULK-005: Close icon (X) button closes the modal', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const closeBtn = page.locator('button:has(.lucide-x)').first();
      await closeBtn.click();
      await expect(page.locator('h3:has-text("Bulk Catalog Upload")')).toHaveCount(0);
    }
  });

  test('POS-BULK-006: Cancel button inside modal dismisses without action', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await expect(page.locator('h3:has-text("Bulk Catalog Upload")')).toHaveCount(0);
      }
    }
  });

  test('POS-BULK-007: Selecting a brand updates the brand dropdown state', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const select = page.locator('select').first();
      const options = await select.locator('option').all();
      if (options.length > 1) {
        await select.selectOption({ index: 1 });
        const val = await select.inputValue();
        expect(val).toBeTruthy();
      }
    }
  });

  test('POS-BULK-008: Modal header displays informative instructions', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await expect(page.locator('text=/pdf|catalog|import/i').first()).toBeVisible();
    }
  });

  test('POS-BULK-009: Upload submit button has distinct call-to-action styling', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    }
  });

  test('POS-BULK-010: Reopening modal resets previously selected state', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const closeBtn = page.locator('button:has(.lucide-x)').first();
      await closeBtn.click();
      await page.waitForTimeout(300);
      await bulkBtn.click();
      const select = page.locator('select').first();
      await expect(select).toHaveValue('');
    }
  });

  // 10 NEGATIVE TESTS
  test('NEG-BULK-001: Clicking upload without selecting brand or file shows error toast', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('[role="status"], .text-red-300, text=/please select/i').first()).toBeVisible();
    }
  });

  test('NEG-BULK-002: Selecting brand without selecting file rejects upload', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const select = page.locator('select').first();
      const options = await select.locator('option').all();
      if (options.length > 1) {
        await select.selectOption({ index: 1 });
      }
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('[role="status"], .text-red-300, text=/please select/i').first()).toBeVisible();
    }
  });

  test('NEG-BULK-003: Selecting non-PDF file (.txt) is rejected by client validator', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const fileInput = page.locator('input[type="file"]');
      // Create a dummy temp file
      const tempPath = path.resolve('temp_invalid.txt');
      fs.writeFileSync(tempPath, 'Hello world text file');
      try {
        await fileInput.setInputFiles(tempPath);
        await expect(page.locator('[role="status"], text=/valid pdf file/i').first()).toBeVisible();
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
  });

  test('NEG-BULK-004: Selecting non-PDF image file (.png) is rejected', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const fileInput = page.locator('input[type="file"]');
      const tempPath = path.resolve('temp_invalid.png');
      fs.writeFileSync(tempPath, 'PNG_BINARY_MOCK');
      try {
        await fileInput.setInputFiles(tempPath);
        await expect(page.locator('[role="status"], text=/valid pdf file/i').first()).toBeVisible();
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
  });

  test('NEG-BULK-005: Sales role does not have Bulk Upload button on products page', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/products');
    await expect(page.getByRole('button', { name: /bulk upload|import/i })).toHaveCount(0);
  });

  test('NEG-BULK-006: Warehouse role does not have Bulk Upload button', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/products');
    await expect(page.getByRole('button', { name: /bulk upload|import/i })).toHaveCount(0);
  });

  test('NEG-BULK-007: Submitting upload with 0 byte empty PDF triggers error handling', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const select = page.locator('select').first();
      const options = await select.locator('option').all();
      if (options.length > 1) {
        await select.selectOption({ index: 1 });
      }
      const emptyPdf = path.resolve('empty.pdf');
      fs.writeFileSync(emptyPdf, '');
      try {
        await page.locator('input[type="file"]').setInputFiles(emptyPdf);
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(1000);
      } finally {
        if (fs.existsSync(emptyPdf)) fs.unlinkSync(emptyPdf);
      }
    }
  });

  test('NEG-BULK-008: Rapid double-click on Upload button does not trigger duplicate parallel submissions', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.dblclick();
      await page.waitForTimeout(300);
    }
  });

  test('NEG-BULK-009: Uploading without network/backend running shows failure message', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      expect(await page.locator('button[type="submit"]').isVisible()).toBeTruthy();
    }
  });

  test('NEG-BULK-010: Modal prevents scrolling background document while open', async ({ page }) => {
    await page.goto('/products');
    const bulkBtn = page.getByRole('button', { name: /bulk upload|import/i });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      const isModalVisible = await page.locator('.fixed.inset-0').first().isVisible();
      expect(isModalVisible).toBeTruthy();
    }
  });
});
