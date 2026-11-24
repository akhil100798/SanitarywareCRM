import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_429_hits');
const successfulApiRequests = new Counter('api_load_success_200');

// Environment configuration with fallbacks
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const ADMIN_USER = __ENV.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'admin123';
const PORTAL_SHARE_TOKEN = __ENV.PORTAL_SHARE_TOKEN || 'QUO-SAMPLE-TOKEN-2026';

export const options = {
  scenarios: {
    // Scenario 1: Standard API load (p95 < 250ms, 0% 5xx errors)
    api_load: {
      executor: 'ramping-vus',
      exec: 'apiLoadScenario',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 0 }
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'api_load' }
    },

    // Scenario 2: Rate limit stress burst against /api/portal/** (isolated from api_load error thresholds)
    rate_limit_burst: {
      executor: 'constant-arrival-rate',
      exec: 'rateLimitBurstScenario',
      rate: 50, // 50 RPS burst
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      startTime: '15s',
      tags: { scenario: 'rate_limit_burst' }
    }
  },

  thresholds: {
    // api_load scenario thresholds
    'http_req_failed{scenario:api_load}': ['rate==0'], // Zero failures on standard CRM API
    'http_req_duration{scenario:api_load}': ['p(95)<250'], // 95% of responses below 250ms

    // rate_limit_burst scenario checks (intentional 429s allowed without failing suite)
    'http_req_duration{scenario:rate_limit_burst}': ['p(95)<500']
  }
};

// Setup step: Authenticate admin user once to obtain Bearer token
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = null;
  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      token = body.token;
    } catch {
      // Token will remain null
    }
  }

  return { token };
}

// Scenario 1 executor: standard authenticated CRM API load
export function apiLoadScenario(data) {
  const token = data?.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  group('Core CRM API Load Flow', () => {
    // A. Catalog list
    const productsRes = http.get(`${BASE_URL}/api/products?page=0&size=20`, { headers: authHeaders });
    check(productsRes, {
      'products status is 200': (r) => r.status === 200
    });
    if (productsRes.status === 200) successfulApiRequests.add(1);

    // B. Dashboard metrics (/api/dashboard/stats)
    const dashboardRes = http.get(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
    check(dashboardRes, {
      'dashboard status is 200': (r) => r.status === 200
    });
    if (dashboardRes.status === 200) successfulApiRequests.add(1);

    // C. GST Tax Summary Report
    const gstRes = http.get(`${BASE_URL}/api/reports/gst-summary`, { headers: authHeaders });
    check(gstRes, {
      'gst-summary status is 200': (r) => r.status === 200
    });
    if (gstRes.status === 200) successfulApiRequests.add(1);

    sleep(1);
  });
}

// Scenario 2 executor: rate limit stress burst against unauthenticated portal
export function rateLimitBurstScenario() {
  group('Portal Rate Limit Burst', () => {
    const portalRes = http.get(`${BASE_URL}/api/portal/quotations/${PORTAL_SHARE_TOKEN}`);
    check(portalRes, {
      'portal response is 200, 404, or throttled 429': (r) =>
        r.status === 200 || r.status === 404 || r.status === 429
    });

    if (portalRes.status === 429) {
      rateLimitHits.add(1);
    }
  });
}

// Default handler for single-scenario runs
export default function (data) {
  apiLoadScenario(data);
}
