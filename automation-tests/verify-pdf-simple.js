const fs = require('fs');
const zlib = require('zlib');

const pdfBytes = fs.readFileSync('evidence/tax-invoice-downloaded.pdf');
const pdfStr = pdfBytes.toString('binary');

// Extract all FlateDecode streams
const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let match;
let allText = '';
let streamCount = 0;

while ((match = streamRegex.exec(pdfStr)) !== null) {
    const streamData = Buffer.from(match[1], 'binary');
    streamCount++;
    try {
        const decompressed = zlib.inflateSync(streamData);
        allText += decompressed.toString('utf8') + '\n';
    } catch(e) {
        // might not be compressed
        allText += match[1] + '\n';
    }
}

console.log('Stream count:', streamCount);
console.log('Decompressed text (first 1000 chars):');
console.log(allText.substring(0, 1000));
console.log('---');
console.log('Has GSTIN marker:', allText.includes('GSTIN') || pdfStr.includes('GSTIN'));
console.log('Has 29ABCDE:', allText.includes('29ABCDE1234F1Z5') || pdfStr.includes('29ABCDE1234F1Z5'));
console.log('Has Karnataka:', allText.includes('Karnataka') || pdfStr.includes('Karnataka'));
console.log('Has Oberoi:', allText.includes('Oberoi') || pdfStr.includes('Oberoi'));
console.log('Has Place of Supply:', allText.includes('Place of Supply') || pdfStr.includes('Place of Supply'));
