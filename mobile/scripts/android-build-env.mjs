import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(process.env.CRM_ANDROID_BUILD_ROOT || path.resolve(scriptDir, '..'));
if (!fs.existsSync(path.join(projectRoot, 'package.json'))
  || JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).name !== 'sanitaryware-crm-mobile') {
  throw new Error('CRM_ANDROID_BUILD_ROOT must point to the mobile project or its disposable native copy');
}
const androidRoot = path.join(projectRoot, 'android');
const gradleUserHome = process.env.GRADLE_USER_HOME || path.join(projectRoot, '.gradle');
const [target, ...targetArgs] = process.argv.slice(2);

const binName = (name) => (process.platform === 'win32' ? `${name}.cmd` : name);

const findWindowsJavaHome = () => {
  const directCandidates = [
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Android\\Android Studio\\jre'
  ];

  const parentCandidates = [
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Java'
  ];

  for (const candidate of directCandidates) {
    if (fs.existsSync(path.join(candidate, 'bin', 'java.exe'))) {
      return candidate;
    }
  }

  for (const parent of parentCandidates) {
    if (!fs.existsSync(parent)) {
      continue;
    }

    const matches = fs.readdirSync(parent)
      .map((name) => path.join(parent, name))
      .filter((candidate) => fs.existsSync(path.join(candidate, 'bin', 'java.exe')))
      .sort()
      .reverse();

    if (matches.length > 0) {
      return matches[0];
    }
  }

  return undefined;
};

const javaHome = process.env.JAVA_HOME
  || (process.platform === 'win32' ? findWindowsJavaHome() : undefined);

const androidSdkRoot = process.env.ANDROID_HOME
  || process.env.ANDROID_SDK_ROOT
  || (process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
    : undefined);
const androidSdkHome = androidSdkRoot && fs.existsSync(androidSdkRoot) ? androidSdkRoot : undefined;
const gradleOpts = [
  process.env.GRADLE_OPTS,
  '-Xmx256m',
  '-XX:MaxMetaspaceSize=192m',
  '-XX:ReservedCodeCacheSize=64m',
  '-XX:CICompilerCount=2',
  '-XX:TieredStopAtLevel=1'
].filter(Boolean).join(' ');

const targets = {
  expo: {
    command: path.join(projectRoot, 'node_modules', '.bin', binName('expo')),
    cwd: projectRoot
  },
  gradle: {
    command: path.join(androidRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'),
    cwd: androidRoot
  }
};

if (!target || !targets[target]) {
  console.error('Usage: node scripts/android-build-env.mjs <expo|gradle> [...args]');
  process.exit(1);
}

const launcher = target === 'gradle'
  ? {
      command: javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java',
      args: ['-jar', path.join(androidRoot, 'gradle', 'wrapper', 'gradle-wrapper.jar'), ...targetArgs],
      cwd: androidRoot
    }
  : { command: process.execPath, args: [path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli'), ...targetArgs], cwd: projectRoot };

const child = spawn(launcher.command, launcher.args, {
  cwd: launcher.cwd,
  env: {
    ...process.env,
    ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    ...(androidSdkHome ? { ANDROID_HOME: androidSdkHome, ANDROID_SDK_ROOT: androidSdkHome } : {}),
    GRADLE_USER_HOME: gradleUserHome,
    GRADLE_OPTS: gradleOpts,
    CMAKE_BUILD_PARALLEL_LEVEL: process.env.CMAKE_BUILD_PARALLEL_LEVEL || '1'
  },
  stdio: 'inherit'
});
child.on('error', error => {
  console.error(`${target} could not launch: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`${target} exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
