const { execSync } = require('child_process');
const ADB = 'C:\\Users\\akhil\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

function adb(cmd) {
  return execSync(`"${ADB}" -s emulator-5554 ${cmd}`).toString();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function login() {
  console.log('Focusing username field...');
  adb('shell input tap 160 286');
  await sleep(400);
  // Clear any existing text
  for (let i = 0; i < 20; i++) adb('shell input keyevent 67');
  adb('shell input text admin');
  await sleep(400);

  console.log('Focusing password field...');
  adb('shell input tap 160 376');
  await sleep(400);
  for (let i = 0; i < 30; i++) adb('shell input keyevent 67');
  adb('shell input text admin123');
  await sleep(400);

  console.log('Tapping Sign In...');
  adb('shell input tap 160 473');
  await sleep(3000);
  console.log('Login sequence completed.');
}

login().catch(console.error);
