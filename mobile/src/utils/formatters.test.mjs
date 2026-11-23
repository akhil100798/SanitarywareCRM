import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMoney,
  formatDate,
  todayIso,
  addDaysIso,
  joinAddress
} from './formatters.js';

test('formatMoney handles null, undefined, 0, and numeric amounts in Indian format', () => {
  assert.equal(formatMoney(0), 'INR 0');
  assert.equal(formatMoney(null), 'INR 0');
  assert.equal(formatMoney(undefined), 'INR 0');
  assert.equal(formatMoney(''), 'INR 0');
  assert.equal(formatMoney(1250), 'INR 1,250');
  assert.equal(formatMoney(1234567.5), 'INR 12,34,567.5');
  assert.equal(formatMoney('50000'), 'INR 50,000');
});

test('formatDate returns formatted date or fallback dash', () => {
  assert.equal(formatDate('2026-11-20'), '2026-11-20');
  assert.equal(formatDate(null), '-');
  assert.equal(formatDate(''), '-');
  assert.equal(formatDate(undefined), '-');
});

test('todayIso returns a valid YYYY-MM-DD date string', () => {
  const today = todayIso();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  const now = new Date();
  assert.equal(today.startsWith(String(now.getUTCFullYear())), true);
});

test('addDaysIso correctly offsets date by given number of days', () => {
  const today = new Date(todayIso());
  const future = new Date(addDaysIso(5));
  const diffTime = future.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 5);

  const past = new Date(addDaysIso(-3));
  const pastDiffTime = today.getTime() - past.getTime();
  const pastDiffDays = Math.round(pastDiffTime / (1000 * 60 * 60 * 24));
  assert.equal(pastDiffDays, 3);
});

test('joinAddress joins address parts cleanly, ignoring falsy and missing parts', () => {
  assert.equal(
    joinAddress({ address: 'Shop 12', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }),
    'Shop 12, Mumbai, Maharashtra, 400001'
  );
  assert.equal(
    joinAddress({ address: 'Plot 45', city: 'Pune', state: null, pincode: '411001' }),
    'Plot 45, Pune, 411001'
  );
  assert.equal(joinAddress(null), '');
  assert.equal(joinAddress({}), '');
});
