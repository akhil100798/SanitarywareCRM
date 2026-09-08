import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPayments } from './paymentSearch.js';

const payments = [
  { paymentNumber: 'REC-100', orderNumber: 'ORD-500', receivedByName: 'Sales User' },
  { paymentNumber: 'REC-200', orderNumber: 'ORD-600', receivedByName: 'Manager User' },
];

test('filters customer payments by receipt, order, and receiver', () => {
  assert.deepEqual(filterPayments(payments, 'ord-600'), [payments[1]]);
  assert.deepEqual(filterPayments(payments, 'sales'), [payments[0]]);
});

test('returns no payment for an impossible query and restores all after clear', () => {
  assert.deepEqual(filterPayments(payments, 'does-not-exist'), []);
  assert.deepEqual(filterPayments(payments, ''), payments);
});
