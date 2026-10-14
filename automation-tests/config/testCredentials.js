require('dotenv').config();

const passwordFor = (role) => {
  const key = `QA_${role.toUpperCase()}_PASSWORD`;
  const value = process.env[key] || process.env[`TEST_${role.toUpperCase()}_PASSWORD`];
  if (!value) {
    throw new Error(`${key} must be set before running QA automation.`);
  }
  return value;
};

const credentials = {
  admin: { username: 'qaadmin', password: passwordFor('admin') },
  manager: { username: 'qamanager', password: passwordFor('manager') },
  sales: { username: 'qasales', password: passwordFor('sales') },
  warehouse: { username: 'qawarehouse', password: passwordFor('warehouse') },
};

module.exports = { credentials, passwordFor };
