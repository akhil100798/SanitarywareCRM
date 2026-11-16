const { request } = require('@playwright/test');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sessionPath = path.resolve(__dirname, '../../audit-artifacts/phase1-client-session.json');

module.exports = async () => {
  const baseURL = process.env.PHASE1_API_URL || 'http://localhost:18091/api';
  const api = await request.newContext({ baseURL });
  try {
    let session = fs.existsSync(sessionPath) ? JSON.parse(fs.readFileSync(sessionPath, 'utf8')) : null;
    if (!session) {
      session = { username: 'phase1-client-admin', password: crypto.randomBytes(24).toString('base64url') };
      const bootstrap = await api.post(`${baseURL}/auth/register`, { data: {
        ...session, email: 'phase1client@example.test', fullName: 'Phase One Client Tests', phoneNumber: '9000010099'
      } });
      if (bootstrap.status() !== 201) throw new Error(`Phase 1 requires an isolated fresh client database; bootstrap returned ${bootstrap.status()}`);
      fs.writeFileSync(sessionPath, JSON.stringify(session));
    }
    const login = await api.post(`${baseURL}/auth/login`, { data: { username: session.username, password: session.password } });
    if (login.status() !== 200) throw new Error(`Phase 1 login returned ${login.status()}`);
    session.token = (await login.json()).token;
    const headers = { Authorization: `Bearer ${session.token}` };
    for (const resource of ['brands', 'categories']) {
      const result = await api.post(`${baseURL}/${resource}`, { headers, data: { name: `Phase1 ${resource} ${crypto.randomUUID()}` } });
      if (result.status() !== 201) throw new Error(`Fixture ${resource} returned ${result.status()}`);
      session[resource === 'brands' ? 'brandId' : 'categoryId'] = (await result.json()).id;
    }
    fs.writeFileSync(sessionPath, JSON.stringify(session));
  } finally { await api.dispose(); }
};
