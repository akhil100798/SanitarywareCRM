import { describe, it, expect } from 'vitest';
import { filterPayments } from './paymentSearch.js';

const payments = [
    { paymentNumber: 'REC-100', orderNumber: 'ORD-500', receivedByName: 'Sales User', customerName: 'Aditya Roy' },
    { paymentNumber: 'REC-200', orderNumber: 'ORD-600', receivedByName: 'Manager User', customerName: 'Sanjay Sharma' },
];

describe('paymentSearch', () => {
    it('filters customer payments by receipt, order, and receiver', () => {
        expect(filterPayments(payments, 'ord-600')).toEqual([payments[1]]);
        expect(filterPayments(payments, 'sales')).toEqual([payments[0]]);
        expect(filterPayments(payments, 'Aditya Roy')).toEqual([payments[0]]);
        expect(filterPayments(payments, 'aditya roy')).toEqual([payments[0]]);
    });

        it('returns no payment for an impossible query and restores all after clear', () => {
            expect(filterPayments(payments, 'does-not-exist')).toEqual([]);
            expect(filterPayments(payments, '')).toEqual(payments);
        });
    });
