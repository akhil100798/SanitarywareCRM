import test from 'node:test';
import assert from 'node:assert/strict';
import { captureOwnedResponse, ownedResource } from '../mobile/scripts/owned-responses.mjs';
const api = 'http://localhost:8081/api';
const response = (path, json, method = 'POST', ok = true) => ({
  url: () => `${api}${path}`, ok: () => ok, request: () => ({ method: () => method }), json
});
test('logout 204 and non-creation actions never attempt JSON parsing', () => {
  for (const path of ['/auth/logout', '/orders/12/status', '/quotations/12/accept', '/products/12/images', '/customers-extra']) {
    const result = captureOwnedResponse(response(path, () => { throw new Error('must not parse'); }), api,
      () => assert.fail('not an owned create'), () => assert.fail('not a parse error'));
    assert.equal(result, null);
  }
});
test('successful creates and quotation conversion register owned IDs', async () => {
  const records = [];
  for (const path of ['/customers', '/payments', '/orders/from-quotation/12']) {
    await captureOwnedResponse(response(path, async () => ({ id: 42 })), api,
      (path, body) => records.push({ resource: ownedResource(path), id: body.id }), assert.fail);
  }
  assert.deepEqual(records.map(x => x.resource), ['customers', 'payments', 'orders']);
});
test('malformed and missing-ID creation responses are reported, not silenced', async () => {
  const errors = [];
  await captureOwnedResponse(response('/customers', async () => { throw new SyntaxError('empty JSON'); }), api,
    assert.fail, error => errors.push(error));
  await captureOwnedResponse(response('/orders', async () => ({})), api, assert.fail, error => errors.push(error));
  assert.match(errors[0], /empty JSON/);
  assert.match(errors[1], /no record ID/);
});
test('failed, GET and unrelated-origin responses do not create cleanup ownership', () => {
  for (const item of [response('/customers', assert.fail, 'GET'), response('/customers', assert.fail, 'POST', false)]) {
    assert.equal(captureOwnedResponse(item, api, assert.fail, assert.fail), null);
  }
  assert.equal(captureOwnedResponse(response('/customers', assert.fail), 'http://another/api', assert.fail, assert.fail), null);
});
