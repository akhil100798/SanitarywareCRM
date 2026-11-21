const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

function adbExec(cmd) {
  return execSync(`"${adb}" ${cmd}`).toString();
}

function dumpHierarchy() {
  adbExec('shell uiautomator dump /sdcard/ui_temp.xml');
  const xml = adbExec('exec-out cat /sdcard/ui_temp.xml');
  const nodes = [];
  const regex = /<node\s+([^>]+)>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const attrStr = match[1];
    const textMatch = attrStr.match(/text="([^"]*)"/);
    const descMatch = attrStr.match(/content-desc="([^"]*)"/);
    const boundsMatch = attrStr.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    const clickableMatch = attrStr.match(/clickable="([^"]*)"/);
    const text = textMatch ? textMatch[1] : '';
    const desc = descMatch ? descMatch[1] : '';
    if (text || desc) {
      nodes.push({
        text,
        desc,
        clickable: clickableMatch ? clickableMatch[1] : 'false',
        bounds: boundsMatch ? { x1: +boundsMatch[1], y1: +boundsMatch[2], x2: +boundsMatch[3], y2: +boundsMatch[4] } : null
      });
    }
  }
  return nodes;
}

console.log(JSON.stringify(dumpHierarchy(), null, 2));
