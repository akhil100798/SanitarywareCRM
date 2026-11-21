import { describe, it, expect } from 'vitest';
import { calculateDocumentTotals } from '../utils/documentTotals';

describe('calculateDocumentTotals (Quotation & Order Totals)', () => {
    it('calculates subtotal, tax, and total accurately with normal values', () => {
        const formData = {
            items: [
                { lineTotal: 1000 },
                { lineTotal: 2500 },
            ],
            taxPercentage: 18,
            shippingCharge: 150,
            discount: 200,
        };

        const totals = calculateDocumentTotals(formData);

        expect(totals.subtotal).toBe(3500);
        expect(totals.taxAmount).toBe(630); // 3500 * 0.18 = 630
        expect(totals.total).toBe(4080); // 3500 + 630 + 150 - 200 = 4080
    });

    it('handles numeric strings for line totals, tax, shipping, and discount', () => {
        const formData = {
            items: [
                { lineTotal: '150.50' },
                { lineTotal: '49.50' },
            ],
            taxPercentage: '5',
            shippingCharge: '20',
            discount: '10',
        };

        const totals = calculateDocumentTotals(formData);

        expect(totals.subtotal).toBe(200);
        expect(totals.taxAmount).toBe(10); // 200 * 0.05 = 10
        expect(totals.total).toBe(220); // 200 + 10 + 20 - 10 = 220
    });

    it('returns zero totals when input data is empty or items array is missing', () => {
        const totals = calculateDocumentTotals({});
        expect(totals).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
    });

    it('handles null, undefined, or missing line totals gracefully', () => {
        const formData = {
            items: [
                { lineTotal: null },
                { lineTotal: undefined },
                { lineTotal: NaN },
                { lineTotal: 500 },
            ],
            taxPercentage: 0,
            shippingCharge: 0,
            discount: 0,
        };

        const totals = calculateDocumentTotals(formData);
        expect(totals.subtotal).toBe(500);
        expect(totals.taxAmount).toBe(0);
        expect(totals.total).toBe(500);
    });

    it('clamps total to 0 when discount exceeds subtotal + tax + shipping', () => {
        const formData = {
            items: [{ lineTotal: 100 }],
            taxPercentage: 18, // 18 tax
            shippingCharge: 10, // subtotal + tax + shipping = 128
            discount: 500, // discount > 128
        };

        const totals = calculateDocumentTotals(formData);
        expect(totals.subtotal).toBe(100);
        expect(totals.taxAmount).toBe(18);
        expect(totals.total).toBe(0); // Clamped at 0, no negative payable amount
    });
});
