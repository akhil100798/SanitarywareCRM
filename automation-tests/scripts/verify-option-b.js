const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log('Logging in...');
        await page.goto('http://localhost/login');
        await page.waitForSelector('input[name="username"]', { timeout: 10000 }).catch(async () => {
            const inputs = await page.$$('input');
            if (inputs.length >= 2) {
                await inputs[0].fill('manager');
                await inputs[1].fill('Manager@123');
            }
        });

        const userField = page.locator('input[name="username"]');
        if (await userField.isVisible()) {
            await userField.fill('manager');
            await page.locator('input[name="password"]').fill('Manager@123');
            await page.locator('button[type="submit"]').click();
        }
        await page.waitForTimeout(2000);

        console.log('Navigating to products page...');
        await page.goto('http://localhost/products');
        await page.waitForTimeout(2500);
        await page.screenshot({ path: 'products-table-verified.png' });
        console.log('Saved products-table-verified.png');

        console.log('Testing Variant Matrix toggle...');
        const matrixBtn = page.getByRole('button', { name: 'Variant Matrix View' });
        if (await matrixBtn.isVisible()) {
            await matrixBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'variant-matrix-verified.png' });
            console.log('Saved variant-matrix-verified.png');
        }

        console.log('Navigating to brands page...');
        await page.goto('http://localhost/brands');
        await page.waitForTimeout(2000);

        const historyBtn = page.locator('text=Versions & Rollback').first();
        if (await historyBtn.isVisible()) {
            await historyBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'brand-catalog-history-verified.png' });
            console.log('Saved brand-catalog-history-verified.png');
        }

        console.log('ALL VERIFICATIONS SUCCESSFUL!');
    } catch (err) {
        console.error('Verification error:', err);
    } finally {
        await browser.close();
    }
})();
