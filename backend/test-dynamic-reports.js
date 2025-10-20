/**
 * Test script for Dynamic Reports API
 * 
 * Usage:
 * 1. Get your auth token from localStorage after logging in to the frontend
 * 2. Set TOKEN variable below
 * 3. Run: node test-dynamic-reports.js
 */

const https = require('https');

// Configuration
const BASE_URL = 'https://clyne-paper-crm-backend.fly.dev'; // Change to localhost:5000 for local testing
const TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your actual token

// Helper function to make API requests
function apiRequest(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log(`REQUEST: POST ${url}`);
    console.log(`BODY: ${JSON.stringify(body, null, 2)}`);
    console.log('='.repeat(80));

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`\nRESPONSE (${res.statusCode}):`);
          console.log(JSON.stringify(result, null, 2));
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Test cases
async function runTests() {
  console.log('🧪 TESTING DYNAMIC REPORTS API\n');

  if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('❌ ERROR: Please set your JWT token in the TOKEN variable');
    console.error('   1. Login to the CRM frontend');
    console.error('   2. Open browser console');
    console.error('   3. Run: localStorage.getItem("token")');
    console.error('   4. Copy the token and paste it in this script');
    process.exit(1);
  }

  try {
    // Test 1: Revenue by location (last 30 days)
    console.log('\n📊 TEST 1: Revenue by Location (Last 30 Days)');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    await apiRequest('/api/reports/query', {
      model: 'invoice',
      filters: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        statuses: ['PAID', 'PARTIALLY_PAID'],
      },
      groupBy: ['locationId'],
      aggregations: ['count', 'sum:totalAmount', 'avg:totalAmount'],
      orderBy: {
        aggregate: '_sum',
        field: 'totalAmount',
        direction: 'desc',
      },
    });

    // Test 2: Total revenue summary
    console.log('\n📊 TEST 2: Total Revenue Summary (Actual Payments)');
    await apiRequest('/api/reports/query', {
      model: 'customerPayment',
      filters: {
        startDate: '2025-01-01',
        endDate: endDate.toISOString().split('T')[0],
        dateField: 'paymentDate',
        statuses: ['COMPLETED'],
      },
      aggregations: ['count', 'sum:amount', 'avg:amount', 'min:amount', 'max:amount'],
    });

    // Test 3: Invoice status distribution
    console.log('\n📊 TEST 3: Invoice Status Distribution');
    await apiRequest('/api/reports/query', {
      model: 'invoice',
      filters: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      groupBy: ['status'],
      aggregations: ['count', 'sum:totalAmount'],
      orderBy: {
        aggregate: '_count',
        field: 'id',
        direction: 'desc',
      },
    });

    // Test 4: Top customers by revenue
    console.log('\n📊 TEST 4: Top Customers by Revenue');
    await apiRequest('/api/reports/query', {
      model: 'invoice',
      filters: {
        startDate: '2025-01-01',
        endDate: endDate.toISOString().split('T')[0],
        statuses: ['PAID', 'PARTIALLY_PAID'],
      },
      groupBy: ['customerId', 'customerName'],
      aggregations: ['count', 'sum:totalAmount'],
      orderBy: {
        aggregate: '_sum',
        field: 'totalAmount',
        direction: 'desc',
      },
      limit: 10,
    });

    // Test 5: Sales by team
    console.log('\n📊 TEST 5: Sales by Team');
    await apiRequest('/api/reports/query', {
      model: 'invoice',
      filters: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        statuses: ['PAID', 'PARTIALLY_PAID'],
      },
      groupBy: ['teamId'],
      aggregations: ['count', 'sum:totalAmount', 'avg:totalAmount'],
      orderBy: {
        aggregate: '_sum',
        field: 'totalAmount',
        direction: 'desc',
      },
    });

    // Test 6: Error handling - invalid model
    console.log('\n📊 TEST 6: Error Handling - Invalid Model');
    await apiRequest('/api/reports/query', {
      model: 'invalidModel',
      filters: {},
      aggregations: ['count'],
    });

    console.log('\n\n✅ All tests completed!');
    console.log('\n💡 TIP: Check the DYNAMIC_REPORTS_API.md documentation for more examples');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
