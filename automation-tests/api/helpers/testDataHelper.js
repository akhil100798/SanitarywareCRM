const fs = require('fs');
const path = require('path');

const readJson = (filename) => {
  const filepath = path.join(__dirname, '../../data', filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
};

const getTestUser = (role) => {
  const users = readJson('test-users.json');
  return users[role];
};

const getTestProduct = () => {
  return readJson('test-products.json')[0];
};

const getTestCustomer = () => {
  return readJson('test-customers.json')[0];
};

module.exports = { getTestUser, getTestProduct, getTestCustomer };
