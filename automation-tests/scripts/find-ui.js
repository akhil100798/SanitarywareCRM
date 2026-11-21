const { execSync } = require('child_process');
const path = require('path');

const adb = 'C:\\Users\\akhil\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

function dump() {
  execSync(`"${adb}" -s emulator-5554 shell "uiautomator dump /sdcard/ui_dump.xml"`);
  const xml = execSync(`"${adb}" -s emulator-5554 exec-out cat /sdcard/ui_dump.xml`).toString();
  const regex = /<node\s+([^>]+)>/g;
  let match;
  const results = [];
  while ((match = regex.exec(xml)) !== null) {
    const attr = match[1];
    const textMatch = attr.match(/text="([^"]*)"/);
    const descMatch = attr.match(/content-desc="([^"]*)"/);
    const boundsMatch = attr.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    const text = textMatch ? textMatch[1] : '';
    const desc = descMatch ? descMatch[1] : '';
    if ((text || desc) && boundsMatch) {
      const x1 = parseInt(boundsMatch[1]);
      const y1 = parseInt(boundsMatch[2]);
      const x2 = parseInt(boundsMatch[3]);
      const y2 = parseInt(boundsMatch[4]);
      const cx = Math.round((x1 + x2) / 2);
      const cy = Math.round((y1 + y2) / 2);
      results.push({ text, desc, bounds: [x1, y1, x2, y2], center: [cx, cy] });
    }
  }
  return results;
}

const filter = process.argv[2] ? process.argv[2].toLowerCase() : '';
const nodes = dump();
nodes.forEach(n => {
  if (!filter || n.text.toLowerCase().includes(filter) || n.desc.toLowerCase().includes(filter)) {
    console.log(`[${n.center[0]}, ${n.center[1]}] text="${n.text}" desc="${n.desc}" bounds=[${n.bounds.join(',')}]`);
  }
});
