import assert from 'node:assert/strict';
import test from 'node:test';
import { createLatestRequestRunner } from './latestRequest.js';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const observer = (events) => ({
  onSuccess: (value) => events.push(['success', value]),
  onError: (error) => events.push(['error', error.message]),
  onFinally: () => events.push(['finally'])
});

test('late older success cannot replace the newest search results', async () => {
  const runner = createLatestRequestRunner();
  const old = deferred();
  const recent = deferred();
  const events = [];
  const first = runner.run(() => old.promise, observer(events));
  const second = runner.run(() => recent.promise, observer(events));
  recent.resolve('latest');
  await second;
  old.resolve('stale');
  await first;
  assert.deepEqual(events, [['success', 'latest'], ['finally']]);
});

test('older failure and completion cannot overwrite a newer successful screen', async () => {
  const runner = createLatestRequestRunner();
  const old = deferred();
  const events = [];
  const first = runner.run(() => old.promise, observer(events));
  await runner.run(() => Promise.resolve('current'), observer(events));
  old.reject(new Error('obsolete network error'));
  await first;
  assert.deepEqual(events, [['success', 'current'], ['finally']]);
});

test('stale completion does not end the current request loading state', async () => {
  const runner = createLatestRequestRunner();
  const old = deferred();
  const recent = deferred();
  const events = [];
  const first = runner.run(() => old.promise, observer(events));
  const second = runner.run(() => recent.promise, observer(events));
  old.resolve('stale');
  await first;
  assert.deepEqual(events, []);
  recent.resolve('current');
  await second;
  assert.deepEqual(events, [['success', 'current'], ['finally']]);
});

test('invalidation suppresses pending updates after query change or unmount', async () => {
  for (const fail of [false, true]) {
    const runner = createLatestRequestRunner();
    const pending = deferred();
    const events = [];
    const work = runner.run(() => pending.promise, observer(events));
    runner.invalidate();
    if (fail) pending.reject(new Error('unmounted'));
    else pending.resolve('unmounted');
    await work;
    assert.deepEqual(events, []);
  }
});

test('current failure is visible and a later retry can succeed', async () => {
  const runner = createLatestRequestRunner();
  const events = [];
  await runner.run(() => Promise.reject(new Error('offline')), observer(events));
  await runner.run(() => Promise.resolve('recovered'), observer(events));
  assert.deepEqual(events, [['error', 'offline'], ['finally'], ['success', 'recovered'], ['finally']]);
});
