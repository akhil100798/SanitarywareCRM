const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'evidence', 'tax-invoice-downloaded.pdf');
const data = fs.readFileSync(pdfPath);
const bufferStr = data.toString('binary');
const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let match;
while ((match = streamRegex.exec(bufferStr)) !== null) {
  const rawStream = Buffer.from(match[1], 'binary');
  try {
    const decompressed = zlib.inflateSync(rawStream);
    console.log(decompressed.toString('utf-8'));
  } catch (e) {
  }
}
