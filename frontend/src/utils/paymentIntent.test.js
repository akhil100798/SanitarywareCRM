import { describe, it, expect } from 'vitest';
import { createPaymentIntentStore } from './paymentIntent.js';

const storage = () => {
    const values = new Map();
    return {
        getItem: (key) => values.get(key),
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
};

describe('paymentIntent', () => {
    it('unchanged payment retries reuse a persisted key across store instances', async () => {
        const adapter = storage();
        const first = createPaymentIntentStore(adapter);
        const key = await first.prepare('user:order', { amount: 60, orderId: 1 });
        await first.failed('user:order', new Error('Network error'));
        const restored = createPaymentIntentStore(adapter);
        expect(await restored.prepare('user:order', { orderId: 1, amount: 60 })).toBe(key);
        expect((await restored.read('user:order')).payload).toEqual({ amount: 60, orderId: 1 });
    });

    it('unknown outcomes prevent edits from silently becoming another payment', async () => {
        const store = createPaymentIntentStore(storage());
        await store.prepare('a', { amount: 60 });
        await store.failed('a', { response: { status: 502 } });
        await expect(store.prepare('a', { amount: 50 })).rejects.toThrow(/previous payment is unknown/);
    });

    it('a definite rejection allows corrected data; unchanged conflict retries keep the key', async () => {
        const store = createPaymentIntentStore(storage());
        const key = await store.prepare('a', { amount: 60 });
        await store.failed('a', { response: { status: 409 } });
        expect(await store.prepare('a', { amount: 60 })).toBe(key);
        expect(await store.prepare('a', { amount: 40 })).not.toBe(key);
    });

    it('successful completion and actor/order separation create independent intents', async () => {
        const store = createPaymentIntentStore(storage());
        const key = await store.prepare('actor1:order1', { amount: 60 });
        expect(await store.prepare('actor2:order1', { amount: 60 })).not.toBe(key);
        await store.complete('actor1:order1');
        expect(await store.read('actor1:order1')).toBeNull();
        expect(await store.prepare('actor1:order1', { amount: 60 })).not.toBe(key);
    });
});
