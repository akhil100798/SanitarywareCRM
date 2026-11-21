const fs = require('fs');
const path = require('path');

function verifyPng(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.subarray(0, 8).toString('hex').toUpperCase();
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const validMagic = magic === '89504E470D0A1A0A';
  console.log({
    file: path.basename(filePath),
    size: buf.length,
    validMagic,
    magic,
    width,
    height
  });
  return validMagic;
}

const file = process.argv[2];
verifyPng(file);
