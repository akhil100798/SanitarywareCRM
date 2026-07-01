const { expect } = require('@playwright/test');

const assertOk = (response, expectedStatus = 200) => {
  expect(response.status()).toBe(expectedStatus);
};

const assertShape = (json, keys) => {
  keys.forEach((key) => {
    expect(json).toHaveProperty(key);
  });
};

module.exports = { assertOk, assertShape };
