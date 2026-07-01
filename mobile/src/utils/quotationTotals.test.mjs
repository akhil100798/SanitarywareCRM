import assert from 'node:assert/strict';
import {
  buildQuotationPayload,
  calculateLineTotal,
  calculateQuotationTotals
} from './quotationTotals.js';

assert.equal(
  calculateLineTotal({ quantity: '2', unitPrice: '1000', discountPercentage: '10' }),
  1800
);

assert.deepEqual(
  calculateQuotationTotals(
    [
      { quantity: 2, unitPrice: 1000, discountPercentage: 10 },
      { quantity: 1, unitPrice: 500, discountPercentage: 0 }
    ],
    18,
    100
  ),
  {
    subtotal: 2300,
    taxAmount: 414,
    total: 2614,
    discount: 100,
    taxPercentage: 18
  }
);

assert.deepEqual(
  buildQuotationPayload({
    customerId: 7,
    quotationDate: '2026-06-28',
    validUntil: '2026-07-05',
    taxPercentage: 18,
    discount: 100,
    notes: 'Site visit',
    termsAndConditions: 'Valid for 7 days.',
    items: [
      {
        productId: 11,
        productName: 'Basin',
        productSku: 'BSN-1',
        quantity: '2',
        unitPrice: '1000',
        discountPercentage: '10',
        notes: 'White'
      }
    ]
  }),
  {
    customerId: 7,
    quotationDate: '2026-06-28',
    validUntil: '2026-07-05',
    taxPercentage: 18,
    taxAmount: 324,
    discount: 100,
    subtotal: 1800,
    total: 2024,
    notes: 'Site visit',
    termsAndConditions: 'Valid for 7 days.',
    items: [
      {
        productId: 11,
        productName: 'Basin',
        productSku: 'BSN-1',
        quantity: 2,
        unitPrice: 1000,
        discountPercentage: 10,
        lineTotal: 1800,
        notes: 'White'
      }
    ]
  }
);

console.log('quotationTotals tests passed');
