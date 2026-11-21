const { execSync } = require('child_process');
const fs = require('fs');

const ADB = 'C:\\Users\\akhil\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

try {
  execSync(`"${ADB}" -s emulator-5554 shell uiautomator dump /sdcard/window_dump.xml`);
  execSync(`"${ADB}" -s emulator-5554 pull /sdcard/window_dump.xml automation-tests/scripts/window_dump.xml`);
  const content = fs.readFileSync('automation-tests/scripts/window_dump.xml', 'utf8');
  const matches = [...content.matchAll(/text="([^"]+)"/g)].map(m => m[1]);
  console.log('UI texts:');
  console.log([...new Set(matches)]);
} catch (err) {
  console.error('Error:', err.message);
}
