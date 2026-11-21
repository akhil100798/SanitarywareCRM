const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'evidence', 'tax-invoice-downloaded.pdf');
const data = fs.readFileSync(pdfPath);

console.log('PDF File Size:', data.length, 'bytes');
console.log('Header Magic:', data.slice(0, 5).toString('ascii'));

// Extract streams
const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let match;
let fullText = '';
const bufferStr = data.toString('binary');

while ((match = streamRegex.exec(bufferStr)) !== null) {
  const rawStream = Buffer.from(match[1], 'binary');
  try {
    const decompressed = zlib.inflateSync(rawStream);
    fullText += decompressed.toString('utf-8') + '\n';
  } catch (e) {
    // raw stream might not be flate compressed
    fullText += rawStream.toString('utf-8') + '\n';
  }
}

console.log('--- Extracted Text Stream Matches ---');
console.log('TAX INVOICE found:', fullText.includes('TAX INVOICE'));
console.log('Place of Supply found:', fullText.includes('Place of Supply'));
console.log('Order Number found:', fullText.includes('ORD-20261119-448205'));
console.log('Customer Name found:', fullText.includes('Oberoi Horizon Residences'));
console.log('Customer State / Karnataka found:', fullText.includes('Karnataka'));
console.log('Product SKU APCS2 found:', fullText.includes('APCS2'));
console.log('GST 18% found:', fullText.includes('18%'));
console.log('Subtotal 392.00 found:', fullText.includes('392.00'));
console.log('Grand Total 462.56 found:', fullText.includes('462.56'));
