import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('native smoke fails before network/browser when its password is missing', () => {
  const env = { ...process.env, API_URL: 'http://127.0.0.1:9/api' };
  delete env.QA_PASSWORD; delete env.QA_ADMIN_PASSWORD;
  const result = spawnSync(process.execPath, ['mobile/scripts/ui-smoke-test.mjs'], { env, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /QA_PASSWORD or QA_ADMIN_PASSWORD is required/);
  assert.doesNotMatch(result.stdout, /Phase 1 API|apiHits/);
});
