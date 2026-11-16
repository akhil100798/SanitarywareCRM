import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionStore } from './sessionStore.js';

const setup = () => {
  const values = new Map();
  const store = createSessionStore({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); }
  }, 'token', 'user');
  return store;
};

test('rejected current token clears token and user and notifies once', async () => {
  const store = setup();
  await store.setToken('expired');
  await store.setUser({ role: 'SALES' });
  let notifications = 0;
  store.subscribeRejected(() => notifications++);
  assert.equal(await store.rejectToken('expired'), true);
  assert.equal(await store.rejectToken('expired'), false);
  assert.equal(await store.getToken(), null);
  assert.equal(await store.getUser(), null);
  assert.equal(notifications, 1);
});

test('late old rejection cannot clear a newer login', async () => {
  const store = setup();
  await store.setToken('old');
  const login = store.setToken('new');
  const rejection = store.rejectToken('old');
  await login;
  assert.equal(await rejection, false);
  assert.equal(await store.getToken(), 'new');
});

test('login queued after rejection remains intact', async () => {
  const store = setup();
  await store.setToken('old');
  const rejected = store.rejectToken('old');
  const login = store.setToken('new');
  assert.equal(await rejected, true);
  await login;
  assert.equal(await store.getToken(), 'new');
});

test('missing token does not clear session and unsubscribed listener is not called', async () => {
  const store = setup();
  await store.setToken('current');
  const unsubscribe = store.subscribeRejected(() => assert.fail('unsubscribed listener'));
  unsubscribe();
  assert.equal(await store.rejectToken(null), false);
  assert.equal(await store.getToken(), 'current');
  assert.equal(await store.rejectToken('current'), true);
});
