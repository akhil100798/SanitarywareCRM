import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueImagePath } from './catalogueImagePath.js';

test('relative and nested catalogue images use the authenticated API adapter', () => {
  assert.equal(catalogueImagePath('/api/files/download/products/catalogue/page.png', '/api', 'http://localhost:5173'),
    '/files/download/products/catalogue/page.png');
});
test('configured separate API origin is supported', () => {
  assert.equal(catalogueImagePath('https://crm-api.example/api/files/download/products/photo.png',
    'https://crm-api.example/api', 'https://crm.example'), '/files/download/products/photo.png');
  assert.equal(catalogueImagePath('/api/files/download/products/photo.png',
    'https://crm-api.example/api', 'https://crm.example'), '/files/download/products/photo.png');
});
test('foreign origins and URL credentials cannot receive a bearer token', () => {
  for (const value of ['https://foreign.example/api/files/download/products/a.png',
    'http://user:password@localhost:5173/api/files/download/products/a.png']) {
    assert.throws(() => catalogueImagePath(value, '/api', 'http://localhost:5173'), /configured CRM/);
  }
});
test('private attachment and encoded traversal paths are not catalogue endpoints', () => {
  for (const value of ['/api/files/download/billpads/private.png',
    '/api/files/download/products/../billpads/private.png', '/api/files/download/products/%2fprivate.png']) {
    assert.throws(() => catalogueImagePath(value, '/api', 'http://localhost:5173'));
  }
});
