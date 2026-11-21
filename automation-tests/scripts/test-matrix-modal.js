const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost/login');
        await page.waitForTimeout(1000);
        console.log('Login URL:', page.url());

        // Fill credentials
        await page.locator('#username').fill('admin');
        await page.locator('#password').fill('admin123');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(2500);
        console.log('After login URL:', page.url());

        await page.goto('http://localhost/products');
        await page.waitForTimeout(2500);
        console.log('Products URL:', page.url());

        const btns = await page.$$eval('button', els => els.map(e => e.textContent.trim()).filter(Boolean));
        console.log('Buttons on products page:', btns);

        const matrixBtn = page.getByRole('button', { name: /Variant Matrix View/i });
        if (await matrixBtn.isVisible()) {
            console.log('Clicking Variant Matrix View...');
            await matrixBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'matrix-view-live.png' });
            console.log('Saved matrix-view-live.png!');
        }

        await page.goto('http://localhost/brands');
        await page.waitForTimeout(2500);
        console.log('Brands URL:', page.url());

        const historyBtn = page.locator('text=Versions & Rollback').first();
        if (await historyBtn.isVisible()) {
            console.log('Clicking Versions & Rollback button...');
            await historyBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'catalog-history-modal-live.png' });
            console.log('Saved catalog-history-modal-live.png!');
        }

    } catch (err) {
        console.error('Error in test:', err);
    } finally {
        await browser.close();
    }
})();
