const { getClient } = require('./apiClient');

const getAdminToken = async () => {
  const client = await getClient();
  let response = await client.post('/api/auth/login', {
    data: {
      username: 'qaadmin',
      password: 'Password@123'
    }
  });
  if (response.status() === 401) {
    const regRes = await client.post('/api/auth/register', {
      data: {
        username: 'qaadmin',
        password: 'Password@123',
        email: 'qaadmin@test.com',
        fullName: 'QA Admin User',
        phoneNumber: '9000000001'
      }
    });
    console.log(`[DEBUG] qaadmin registration status: ${regRes.status()}`);
    response = await client.post('/api/auth/login', {
      data: {
        username: 'qaadmin',
        password: 'Password@123'
      }
    });
    console.log(`[DEBUG] qaadmin login status: ${response.status()}`);
  }
  if (response.ok()) {
    const json = await response.json();
    return json.token;
  }
  throw new Error(`Failed to obtain admin token: ${response.status()}`);
};

const getSalesToken = async () => {
  const client = await getClient();
  let response = await client.post('/api/auth/login', {
    data: {
      username: 'qasales',
      password: 'Password@123'
    }
  });
  if (response.status() === 401) {
    const adminToken = await getAdminToken();
    const adminClient = await getClient(adminToken);
    const regRes = await adminClient.post('/api/auth/register', {
      data: {
        username: 'qasales',
        password: 'Password@123',
        email: 'qasales@test.com',
        fullName: 'QA Sales User',
        phoneNumber: '9000000002'
      }
    });
    console.log(`[DEBUG] qasales registration status: ${regRes.status()}`);
    response = await client.post('/api/auth/login', {
      data: {
        username: 'qasales',
        password: 'Password@123'
      }
    });
    console.log(`[DEBUG] qasales login status: ${response.status()}`);
  }
  if (response.ok()) {
    const json = await response.json();
    return json.token;
  }
  throw new Error(`Failed to obtain sales token: ${response.status()}`);
};

const getManagerToken = async () => {
  const client = await getClient();
  const response = await client.post('/api/auth/login', {
    data: {
      username: process.env.QA_MANAGER_USERNAME || 'qamanager',
      password: process.env.QA_MANAGER_PASSWORD || 'Password@123',
    },
  });
  if (response.ok()) {
    const json = await response.json();
    return json.token;
  }
  throw new Error(`Failed to obtain manager token: ${response.status()}`);
};

const getWarehouseToken = async () => {
  const client = await getClient();
  const response = await client.post('/api/auth/login', {
    data: {
      username: process.env.QA_WAREHOUSE_USERNAME || 'qawarehouse',
      password: process.env.QA_WAREHOUSE_PASSWORD || 'Password@123',
    },
  });
  if (response.ok()) {
    const json = await response.json();
    return json.token;
  }
  throw new Error(`Failed to obtain warehouse token: ${response.status()}`);
};

module.exports = { getAdminToken, getManagerToken, getSalesToken, getWarehouseToken };
