import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDocumentTotals } from './documentTotals.js';

test('combines numeric and string line totals with tax, shipping and discount', () => {
    assert.deepEqual(calculateDocumentTotals({
        items: [{ lineTotal: 100 }, { lineTotal: '200' }],
        taxPercentage: '18', shippingCharge: '20', discount: '10',
    }), { subtotal: 300, taxAmount: 54, total: 364 });
});

test('empty optional fields produce zero totals', () => {
    assert.deepEqual(calculateDocumentTotals({}), { subtotal: 0, taxAmount: 0, total: 0 });
});

test('discount cannot produce a negative payable amount', () => {
    assert.equal(calculateDocumentTotals({ items: [{ lineTotal: 10 }], discount: 20 }).total, 0);
});
