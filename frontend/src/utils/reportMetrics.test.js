import test from 'node:test';
import assert from 'node:assert/strict';
import { formatReportMetric } from './reportMetrics.js';
test('all six report count metrics are quantities, not currency', () => {
  for (const label of ['Total Orders', 'Total Customers With Balance', 'Total Distributors With Balance',
    'Total Transactions', 'Received Orders Count', 'Total Products', 'Active Products', 'Total Stock Quantity',
    'Low Stock Count', 'Out Of Stock Count']) assert.equal(formatReportMetric(label, 25), '25', label);
});
test('monetary report metrics retain currency and fractional precision', () => {
  for (const label of ['Total Sales Value', 'Total Tax Collected', 'Total Discount Given', 'Average Order Value',
    'Total Receivables Outstanding', 'Total Payables Outstanding', 'Total Received', 'Total Purchases',
    'Total Paid', 'Total Payables', 'Total Catalog Value']) assert.equal(formatReportMetric(label, 1000.25), '₹1,000.25', label);
});
test('unknown numeric metric is not silently misclassified as money', () => {
  assert.equal(formatReportMetric('New Quantity', 12), '12');
});
