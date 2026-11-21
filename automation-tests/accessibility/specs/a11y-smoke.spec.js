const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { LoginPage } = require('../../frontend/pages/LoginPage');

test.describe('Accessibility Smoke Checks (WCAG 2.1 AA)', () => {

    test('Login Page meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = accessibilityScanResults.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalOrSerious).toEqual([]);
    });

    test('Dashboard Page meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.login('qaadmin', 'Password@123');
        await page.waitForLoadState('networkidle');
        await page.locator('text=Assembling business analytics...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = accessibilityScanResults.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalOrSerious).toEqual([]);
    });

    test('Products Page meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.login('qaadmin', 'Password@123');
        await page.goto('/products');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = accessibilityScanResults.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalOrSerious).toEqual([]);
    });

    test('Quotations Page meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.login('qaadmin', 'Password@123');
        await page.goto('/quotations');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = accessibilityScanResults.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalOrSerious).toEqual([]);
    });

    test('Reports Page meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.navigate();
        await loginPage.login('qaadmin', 'Password@123');
        await page.goto('/reports');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = accessibilityScanResults.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalOrSerious).toEqual([]);
    });
});
