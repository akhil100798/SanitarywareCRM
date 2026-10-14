import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { deleteRequest } = require('../automation-tests/scripts/cleanup-test-data.js');
test('cleanup rejects real anonymous deletion response rather than claiming success', async () => {
  await assert.rejects(deleteRequest('/api/customers/999999999'), /401/);
});
test('cleanup exits nonzero when disposable backend is unreachable', () => {
  const result = spawnSync(process.execPath, ['automation-tests/scripts/cleanup-test-data.js'], {
    env: { ...process.env, BACKEND_BASE_URL: 'http://127.0.0.1:9' }, encoding: 'utf8', timeout: 15000
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Cleanup failed/);
});
