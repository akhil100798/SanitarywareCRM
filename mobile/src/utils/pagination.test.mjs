import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePage, mergePage } from './pagination.mjs';

test('first page retains the backend total and next-page metadata', () => {
  assert.deepEqual(normalizePage({ content: [{ id: 1 }], number: 0, totalElements: 51, last: false }),
    { items: [{ id: 1 }], page: 0, total: 51, hasNext: true });
});
test('last and empty pages cannot request another page', () => {
  assert.deepEqual(normalizePage({ content: [{ id: 51 }], number: 1, totalElements: 51, last: true }),
    { items: [{ id: 51 }], page: 1, total: 51, hasNext: false });
  assert.equal(normalizePage({ content: [], number: 0, totalElements: 0, last: true }).hasNext, false);
});
test('unpaged lists and settings objects are terminal', () => {
  assert.deepEqual(normalizePage([{ id: 1 }]), { items: [{ id: 1 }], page: 0, total: 1, hasNext: false });
  assert.deepEqual(normalizePage({ companyName: 'QA' }).items, [{ companyName: 'QA' }]);
  assert.deepEqual(normalizePage(null).items, []);
});
test('page merge removes duplicates and retains the latest record', () => {
  assert.deepEqual(mergePage([{ id: 1, name: 'old' }], [{ id: 1, name: 'new' }, { id: 2 }]),
    [{ id: 1, name: 'new' }, { id: 2 }]);
});
