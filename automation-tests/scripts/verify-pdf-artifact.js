const fs = require('fs');
const zlib = require('zlib');
const API_BASE = 'http://localhost:8081/api';

async function testPdf() {
  const loginRes = await fetch(API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'qaadmin', password: 'Password@123' })
  });
  const { token } = await loginRes.json();
  const pdfRes = await fetch(API_BASE + '/orders/49/invoice/pdf', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const buf = Buffer.from(await pdfRes.arrayBuffer());
  fs.writeFileSync('automation-tests/evidence/tax-invoice-downloaded.pdf', buf);
  console.log('PDF saved, size:', buf.length);

  const matches = [...buf.toString('latin1').matchAll(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g)];
  let text = '';
  matches.forEach(m => {
    try {
      text += zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('utf8') + '\n';
    } catch (e) {}
  });

  const checks = [
    'TAX INVOICE',
    'Sanitaryware CRM Store',
    '29ABCDE1234F1Z5',
    'Place of Supply: Karnataka',
    'Oberoi Horizon Residences',
    'Oberoi Realty Projects Ltd',
    'APCS2',
    '392.00',
    '70.56',
    '462.56'
  ];
  checks.forEach(c => console.log(c, ':', text.includes(c)));
  console.log('Absence of SQLi:', !text.includes("' OR '1'='1' --"));
}

testPdf().catch(console.error);
