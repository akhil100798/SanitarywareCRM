import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const config = require('../../metro.config.js');
const patterns = [].concat(config.resolver.blockList || []);
const excluded = (file) => patterns.some((pattern) => pattern.test(file));

test('Metro excludes retained exports and native build output with both separators', () => {
  const directories = [
    '.qa-export-run-example', '.qa-hermes-temp-example', 'dist-check-current',
    'dist-check-qa-2', '.node_modules-incomplete-backup', '.gradle',
    'android/.gradle', 'android/.kotlin', 'android/build',
    'android/app/build', 'android/app/.cxx'
  ];
  for (const directory of directories) {
    const file = path.join(config.projectRoot, directory, 'nested', 'package.json');
    assert(excluded(file), file);
    assert(excluded(file.replaceAll('\\', '/')), file);
  }
});

test('Metro keeps application, dependencies and native source visible', () => {
  for (const relative of [
    'src/screens/LoginScreen.js', 'src/screens/OrderDetailScreen.js',
    'node_modules/react-native/index.js', 'android/app/src/main/MainActivity.kt',
    'src/dist-check-example.js'
  ]) {
    const file = path.join(config.projectRoot, relative);
    assert(!excluded(file), file);
    assert(!excluded(file.replaceAll('\\', '/')), file);
  }
});

test('Metro exclusion expressions retain compatible flags', () => {
  assert.equal(new Set(patterns.map((pattern) => pattern.flags)).size, 1);
});
