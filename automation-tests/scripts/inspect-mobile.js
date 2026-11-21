const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const screenshotDir = path.join(__dirname, '..', '..', 'docs', 'qa-screenshots');

function adbExec(cmd) {
  return execSync(`"${adb}" ${cmd}`).toString();
}

function dumpHierarchy() {
  adbExec('shell uiautomator dump /sdcard/ui_temp.xml');
  const xml = adbExec('exec-out cat /sdcard/ui_temp.xml');
  const texts = [];
  const regex = /text="([^"]+)"/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    if (m[1].trim()) texts.push(m[1].trim());
  }
  return { xml, texts };
}

function captureScreenshot(filename) {
  const targetPath = path.join(screenshotDir, filename);
  execSync(`"${adb}" exec-out screencap -p > "${targetPath}"`);
  console.log(`Saved screenshot: ${filename}`);
}

const { texts } = dumpHierarchy();
console.log('Visible UI Texts:');
console.log(texts);
