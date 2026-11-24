import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStockReceiveQuantity,
  computeNewStock,
  canAccessStockReceive,
  filterPaymentLedger,
  calculatePaymentLedgerStats
} from './opsValidation.js';

test('validateStockReceiveQuantity accepts valid positive integers', () => {
  assert.deepEqual(validateStockReceiveQuantity(1), { isValid: true, quantity: 1 });
  assert.deepEqual(validateStockReceiveQuantity('50'), { isValid: true, quantity: 50 });
  assert.deepEqual(validateStockReceiveQuantity('  25  '), { isValid: true, quantity: 25 });
  assert.deepEqual(validateStockReceiveQuantity(1000), { isValid: true, quantity: 1000 });
});

test('validateStockReceiveQuantity rejects zero, negative numbers, floats, and empty inputs', () => {
  assert.equal(validateStockReceiveQuantity(0).isValid, false);
  assert.equal(validateStockReceiveQuantity(-5).isValid, false);
  assert.equal(validateStockReceiveQuantity('-10').isValid, false);
  assert.equal(validateStockReceiveQuantity(1.5).isValid, false);
  assert.equal(validateStockReceiveQuantity('12.34').isValid, false);
  assert.equal(validateStockReceiveQuantity('').isValid, false);
  assert.equal(validateStockReceiveQuantity(null).isValid, false);
  assert.equal(validateStockReceiveQuantity(undefined).isValid, false);
  assert.equal(validateStockReceiveQuantity('abc').isValid, false);
  assert.equal(validateStockReceiveQuantity('12a').isValid, false);
});

test('computeNewStock computes accurate sum of current and received stock', () => {
  assert.equal(computeNewStock(10, 5), 15);
  assert.equal(computeNewStock('20', '30'), 50);
  assert.equal(computeNewStock(0, 10), 10);
  assert.equal(computeNewStock(null, 25), 25);
  assert.equal(computeNewStock(undefined, 5), 5);
});

test('canAccessStockReceive allows ADMIN, MANAGER, WAREHOUSE and denies SALES and invalid roles', () => {
  assert.equal(canAccessStockReceive('ADMIN'), true);
  assert.equal(canAccessStockReceive('admin'), true);
  assert.equal(canAccessStockReceive('MANAGER'), true);
  assert.equal(canAccessStockReceive('manager'), true);
  assert.equal(canAccessStockReceive('WAREHOUSE'), true);
  assert.equal(canAccessStockReceive('warehouse'), true);

  assert.equal(canAccessStockReceive('SALES'), false);
  assert.equal(canAccessStockReceive('GUEST'), false);
  assert.equal(canAccessStockReceive(''), false);
  assert.equal(canAccessStockReceive(null), false);
  assert.equal(canAccessStockReceive(undefined), false);
});

test('filterPaymentLedger filters by payment mode correctly', () => {
  const samplePayments = [
    { id: 1, customerName: 'Rajesh Sharma', orderId: 101, paymentMethod: 'UPI', amount: 5000 },
    { id: 2, customerName: 'Anita Patel', orderId: 102, paymentMethod: 'NEFT', amount: 15000 },
    { id: 3, customerName: 'Deepak Verma', orderId: 103, paymentMethod: 'CASH', amount: 2000 },
    { id: 4, customerName: 'Vikram Singh', orderId: 104, paymentMethod: 'UPI', amount: 7500 }
  ];

  const all = filterPaymentLedger(samplePayments, { mode: 'All' });
  assert.equal(all.length, 4);

  const upiOnly = filterPaymentLedger(samplePayments, { mode: 'UPI' });
  assert.equal(upiOnly.length, 2);
  assert.deepEqual(upiOnly.map((p) => p.id), [1, 4]);

  const neftOnly = filterPaymentLedger(samplePayments, { mode: 'NEFT' });
  assert.equal(neftOnly.length, 1);
  assert.equal(neftOnly[0].id, 2);

  const cashOnly = filterPaymentLedger(samplePayments, { mode: 'Cash' });
  assert.equal(cashOnly.length, 1);
  assert.equal(cashOnly[0].id, 3);
});

test('filterPaymentLedger searches by customer, orderId, or reference', () => {
  const samplePayments = [
    { id: 1, customerName: 'Rajesh Sharma', orderId: 101, paymentMethod: 'UPI', referenceNumber: 'UTR998877', amount: 5000 },
    { id: 2, customerName: 'Anita Patel', orderId: 102, paymentMethod: 'NEFT', referenceNumber: 'TXN112233', amount: 15000 }
  ];

  const byName = filterPaymentLedger(samplePayments, { query: 'sharma' });
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, 1);

  const byOrderId = filterPaymentLedger(samplePayments, { query: '102' });
  assert.equal(byOrderId.length, 1);
  assert.equal(byOrderId[0].id, 2);

  const byRef = filterPaymentLedger(samplePayments, { query: 'utr998' });
  assert.equal(byRef.length, 1);
  assert.equal(byRef[0].id, 1);

  const noMatch = filterPaymentLedger(samplePayments, { query: 'nonexistent' });
  assert.equal(noMatch.length, 0);
});

test('calculatePaymentLedgerStats computes totals and aging buckets accurately', () => {
  const samplePayments = [
    { amount: 5000 },
    { amount: 12500 },
    { amount: 2500 }
  ];

  const mockAging = {
    totalOutstanding: 45000,
    bucket0To30: 20000,
    bucket31To60: 15000,
    bucket61To90: 7000,
    bucket90Plus: 3000
  };

  const stats = calculatePaymentLedgerStats(samplePayments, mockAging);

  assert.equal(stats.totalCollected, 20000);
  assert.equal(stats.totalOutstanding, 45000);
  assert.equal(stats.agingBuckets['0-30'], 20000);
  assert.equal(stats.agingBuckets['31-60'], 15000);
  assert.equal(stats.agingBuckets['61-90'], 7000);
  assert.equal(stats.agingBuckets['90+'], 3000);
});

test('calculatePaymentLedgerStats handles null/empty payloads safely', () => {
  const stats = calculatePaymentLedgerStats([], null);
  assert.equal(stats.totalCollected, 0);
  assert.equal(stats.totalOutstanding, 0);
  assert.deepEqual(stats.agingBuckets, {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0
  });
});
