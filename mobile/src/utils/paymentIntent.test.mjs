import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentIntentStore } from './paymentIntent.js';

const storage = () => { const values = new Map(); return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };

test('unchanged payment retries reuse a persisted key across store instances', async () => {
    const adapter = storage(); const first = createPaymentIntentStore(adapter);
    const key = await first.prepare('user:order', { amount: 60, orderId: 1 });
    await first.failed('user:order', new Error('Network error'));
    const restored = createPaymentIntentStore(adapter);
    assert.equal(await restored.prepare('user:order', { orderId: 1, amount: 60 }), key);
    assert.deepEqual((await restored.read('user:order')).payload, { amount: 60, orderId: 1 });
});

test('unknown outcomes prevent edits from silently becoming another payment', async () => {
    const store = createPaymentIntentStore(storage());
    await store.prepare('a', { amount: 60 });
    await store.failed('a', { response: { status: 502 } });
    await assert.rejects(store.prepare('a', { amount: 50 }), /previous payment is unknown/);
});

test('a definite rejection allows corrected data; unchanged conflict retries keep the key', async () => {
    const store = createPaymentIntentStore(storage()); const key = await store.prepare('a', { amount: 60 });
    await store.failed('a', { response: { status: 409 } });
    assert.equal(await store.prepare('a', { amount: 60 }), key);
    assert.notEqual(await store.prepare('a', { amount: 40 }), key);
});

test('successful completion and actor/order separation create independent intents', async () => {
    const store = createPaymentIntentStore(storage()); const key = await store.prepare('actor1:order1', { amount: 60 });
    assert.notEqual(await store.prepare('actor2:order1', { amount: 60 }), key);
    await store.complete('actor1:order1');
    assert.equal(await store.read('actor1:order1'), null);
    assert.notEqual(await store.prepare('actor1:order1', { amount: 60 }), key);
});
