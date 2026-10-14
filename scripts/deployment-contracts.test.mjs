import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('QA CI injects its required JWT secret and validates credentials before boot', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /JWT_SECRET:\s*\$\{\{ secrets\.QA_JWT_SECRET \}\}/);
  assert.match(ci, /Validate QA environment/);
  assert.match(ci, /npm run seed/);
  assert.match(ci, /npm run cleanup/);
  assert.match(ci, /Mobile Chrome \(Pixel 5\)/);
});
test('API image URLs cannot be intercepted by nginx static-extension regex', () => {
  assert.match(read('frontend/nginx.conf'), /location\s+\^~\s+\/api\//);
});
test('asset responses retain security-header snippet despite Cache-Control override', () => {
  const conf = read('frontend/nginx.conf');
  const assets = conf.match(/location ~\* [\s\S]*?\n    }/)?.[0];
  assert.match(assets || '', /include \/etc\/nginx\/snippets\/crm-security-headers\.conf/);
  const headers = read('frontend/nginx-security-headers.conf');
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(read('frontend/Dockerfile'), /COPY nginx-security-headers.conf/);
});
