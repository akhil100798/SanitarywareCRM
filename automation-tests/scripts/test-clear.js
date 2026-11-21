const { execSync } = require('child_process');
const adb = 'C:\\Users\\akhil\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const nums = Array.from({length: 65}, (_, i) => i + 1).join(' ');
execSync(`"${adb}" -s emulator-5554 shell "input tap 280 261 && input keyevent 123 && for i in ${nums}; do input keyevent 67; done"`);
console.log('Cleared successfully!');
