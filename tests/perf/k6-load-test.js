import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_failed': ['rate<0.05'],   // Error rate must be less than 5%
    'errors': ['rate<0.1'],              // Custom error rate must be less than 10%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000';

// Login and get auth token
function login() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'admin@clynepapers.com',
    password: 'admin123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'got auth token': (r) => r.json('data.token') !== undefined,
  });

  if (loginRes.status !== 200) {
    errorRate.add(1);
    return null;
  }

  return loginRes.json('data.token');
}

// Test scenarios
export default function () {
  const token = login();
  
  if (!token) {
    return; // Skip if login failed
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Scenario 1: Get dashboard metrics
  const dashboardRes = http.get(`${BASE_URL}/api/dashboard/metrics`, { headers });
  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Scenario 2: List customers
  const customersRes = http.get(`${BASE_URL}/api/customers?page=1&limit=50`, { headers });
  check(customersRes, {
    'customers loaded': (r) => r.status === 200,
    'customers response time OK': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(1);

  // Scenario 3: List invoices
  const invoicesRes = http.get(`${BASE_URL}/api/invoices?page=1&limit=20`, { headers });
  check(invoicesRes, {
    'invoices loaded': (r) => r.status === 200,
    'invoices response time OK': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  sleep(1);

  // Scenario 4: Get inventory
  const inventoryRes = http.get(`${BASE_URL}/api/inventory?page=1&limit=50`, { headers });
  check(inventoryRes, {
    'inventory loaded': (r) => r.status === 200,
    'inventory response time OK': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  sleep(2);
}

// Lifecycle hooks
export function setup() {
  console.log('Starting load test...');
  console.log(`Target: ${BASE_URL}`);
}

export function teardown(data) {
  console.log('Load test completed');
}
