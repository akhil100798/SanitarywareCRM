const fs = require('fs');

function findElement(text) {
  const content = fs.readFileSync('automation-tests/scripts/window_dump.xml', 'utf8');
  const regex = new RegExp(`<node[^>]*text="([^"]*${text}[^"]*)"[^>]*bounds="(\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\])"`, 'g');
  let match;
  const results = [];
  while ((match = regex.exec(content)) !== null) {
    const fullText = match[1];
    const boundsStr = match[2];
    const x1 = parseInt(match[3]), y1 = parseInt(match[4]), x2 = parseInt(match[5]), y2 = parseInt(match[6]);
    results.push({
      text: fullText,
      bounds: boundsStr,
      center: { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) }
    });
  }
  return results;
}

const target = process.argv[2] || '';
console.log(JSON.stringify(findElement(target), null, 2));
