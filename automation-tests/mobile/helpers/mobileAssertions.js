const { expect } = require('@playwright/test');

const assertHeaderTitle = async (page, expectedTitle) => {
  const titleLocator = page.locator('header, .header-title, h1').first();
  await expect(titleLocator).toContainText(expectedTitle);
};

module.exports = { assertHeaderTitle };
