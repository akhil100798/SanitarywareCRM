const { chromium } = require('@playwright/test');
const path = require('path');

async function generateNote() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: 'Courier New', Courier, monospace;
                background-color: #faf5eb;
                padding: 40px;
                color: #1f2937;
            }
            .paper {
                background: white;
                border: 2px dashed #9ca3af;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.08);
            }
            h2 {
                margin-top: 0;
                font-size: 22px;
                border-bottom: 2px solid #1f2937;
                padding-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .item {
                font-size: 19px;
                font-weight: bold;
                line-height: 2.2;
                margin: 14px 0;
                border-bottom: 1px dashed #e5e7eb;
            }
            .date {
                float: right;
                font-size: 14px;
                color: #6b7280;
            }
        </style>
    </head>
    <body>
        <div class="paper">
            <span class="date">DATE: 17-NOV-2026</span>
            <h2>SITE ESTIMATE SLIP - JOHNSON BATHROOMS</h2>
            <div class="item">ITEM 1: L0664AVTRU - 2 PCS (WALL HUNG WC VIGO)</div>
            <div class="item">ITEM 2: L0607LRUF - 4 NOS (VERONA LUCCA BASIN)</div>
            <div class="item">ITEM 3: 5 PIECES WHITE CERAMIC BASIN</div>
        </div>
    </body>
    </html>
    `;
    await page.setContent(htmlContent);
    const outputPath = path.join(__dirname, 'contractor-estimate-note.png');
    await page.locator('.paper').screenshot({ path: outputPath });
    await browser.close();
    console.log('Generated contractor estimate photo:', outputPath);
}

generateNote().catch(console.error);
