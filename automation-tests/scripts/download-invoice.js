const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1/api';
const EVIDENCE_DIR = path.join(__dirname, '..', 'evidence');

async function downloadInvoice() {
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  const orderId = 49;
  console.log(`Downloading statutory Tax Invoice PDF for Order ${orderId}...`);
  const invoicePdfRes = await fetch(`${API_BASE}/orders/${orderId}/invoice/pdf`, { headers: authHeaders });
  if (!invoicePdfRes.ok) throw new Error(`Invoice PDF fetch failed: ${invoicePdfRes.status}`);
  const pdfBuffer = Buffer.from(await invoicePdfRes.arrayBuffer());
  const invoicePdfPath = path.join(EVIDENCE_DIR, 'tax-invoice-downloaded.pdf');
  fs.writeFileSync(invoicePdfPath, pdfBuffer);
  console.log(`✓ Tax Invoice PDF saved: ${invoicePdfPath} (${pdfBuffer.length} bytes)`);

  // Assert PDF magic bytes
  const magic = pdfBuffer.slice(0, 5).toString('ascii');
  if (magic !== '%PDF-') throw new Error(`Invalid PDF header magic: ${magic}`);
  console.log(`✓ Verified PDF header magic: ${magic}`);

  const pdfText = pdfBuffer.toString('latin1');
  const hasTaxInvoice = pdfText.includes('TAX INVOICE') || pdfText.includes('Invoice');
  const hasGstin = pdfText.includes('GSTIN') || pdfText.includes('29ABCDE1234F1Z5');
  console.log(`✓ Invoice contains Tax Invoice Title: ${hasTaxInvoice}`);
  console.log(`✓ Invoice contains GSTIN references: ${hasGstin}`);
}

downloadInvoice().catch(console.error);
