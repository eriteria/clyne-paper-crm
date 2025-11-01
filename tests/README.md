# Clyne Paper CRM - Test Suite

## Quick Start

### Prerequisites

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Setup Test Database**
   
   Create a `.env.test` file in the `backend` directory:
   ```env
   TEST_DATABASE_URL="postgresql://testuser:testpass@localhost:5432/clyne_crm_test"
   JWT_SECRET="test-jwt-secret-key-for-testing-only"
   JWT_REFRESH_SECRET="test-refresh-secret-key-for-testing-only"
   NODE_ENV="test"
   ```

3. **Run Database Migrations**
   ```bash
   cd backend
   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
   ```

### Running Tests

#### All Tests
```bash
npm test
```

#### Backend Tests Only
```bash
npm run test:backend
```

#### Frontend Tests Only
```bash
npm run test:frontend
```

#### Integration Tests
```bash
npm run test:integration
```

#### End-to-End Tests
```bash
# Headless mode
npm run test:e2e

# With UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

#### Security Tests
```bash
npm run test:security
```

#### Performance Tests
```bash
# With Artillery
npm run test:perf

# With k6
npm run test:perf:k6
```

#### Coverage Reports
```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── README.md                    # This file
├── README_TEST_PLAN.md          # Comprehensive test plan
├── ASSUMPTIONS.md               # Test assumptions
├── TODO.md                      # Manual intervention tasks
├── inventory.json               # Repository component inventory
├── playwright.config.ts         # E2E test configuration
│
├── utils/                       # Test utilities
│   └── testDb.ts               # Database helpers
│
├── factories/                   # Test data factories
│   ├── index.ts                # Factory manager
│   ├── user.factory.ts
│   ├── customer.factory.ts
│   ├── invoice.factory.ts
│   └── waybill.factory.ts
│
├── fixtures/                    # Test data fixtures
│   ├── customers.json
│   ├── users.json
│   └── seed-test-db.ts         # Database seeding script
│
├── unit/                        # Unit tests
│   ├── backend/                # Backend unit tests
│   └── frontend/               # Frontend unit tests
│
├── integration/                 # Integration tests
│   ├── invoices.test.ts        # Invoice API tests
│   └── payments.test.ts        # Payment API tests
│
├── e2e/                        # End-to-end tests
│   ├── auth/                   # Authentication tests
│   ├── customers/              # Customer management tests
│   ├── invoices/               # Invoice lifecycle tests
│   └── ...
│
├── security/                    # Security tests
│   └── auth-security.test.ts   # Auth security tests
│
└── perf/                       # Performance tests
    ├── artillery-config.yml    # Artillery load tests
    └── k6-load-test.js        # k6 load tests
```

## Test Categories

### 1. Unit Tests
- **Backend**: Tests for utilities, validators, services
- **Frontend**: Tests for components, hooks, utilities
- **Coverage Goal**: 90% backend, 80% frontend

### 2. Integration Tests
- Test API routes with database
- Test business logic workflows
- Test data integrity

**Available:**
- Invoice API (11 test cases)
- Payment API (15 test cases)

### 3. End-to-End Tests
- Test complete user workflows
- Multi-browser testing (Chromium, Firefox, WebKit)
- Screenshot and video capture on failure

**Available:**
- Authentication (8 test cases)
- Customer Management (10 test cases)
- Invoice Lifecycle (3 test cases)

### 4. Security Tests
- Authentication vulnerabilities
- Authorization checks
- Input validation
- Session management

**Available:**
- Auth Security (15+ test cases)

### 5. Performance Tests
- Load testing critical endpoints
- Concurrent user simulation
- Response time thresholds

**Available:**
- Artillery configuration (5 scenarios)
- k6 load tests (4 scenarios)

## CI/CD Integration

Tests run automatically on:
- Every push to main/develop branches
- Every pull request
- Daily security scans

### GitHub Actions Workflows

1. **Unit Tests** - Runs on all pushes
2. **Integration Tests** - Runs on PRs to main/develop
3. **E2E Tests** - Runs on PRs to main
4. **Security Tests** - Runs daily + on main branch

## Writing Tests

### Integration Test Example

```typescript
import request from "supertest";
import { createApp } from "../../backend/src/app";
import { createTestFactory } from "../factories";

describe("My API", () => {
  let app: Express;
  let factory: TestDataFactory;

  beforeAll(async () => {
    app = createApp({ enableRateLimit: false });
    factory = createTestFactory(prisma);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await seedBasicData(prisma);
  });

  it("should do something", async () => {
    const customer = await factory.customers.create();
    
    const response = await request(app)
      .get(`/api/customers/${customer.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from "@playwright/test";

test("should complete workflow", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@clynepapers.com");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  
  await page.waitForURL("/dashboard");
  await expect(page).toHaveURL("/dashboard");
});
```

## Debugging Tests

### Backend Tests
```bash
# Run specific test file
npm test -- tests/integration/invoices.test.ts

# Run with verbose output
DEBUG=* npm test

# Run single test
npm test -- -t "should create invoice"
```

### E2E Tests
```bash
# Run specific test file
npm run test:e2e -- invoices

# Debug mode (opens browser)
npm run test:e2e:debug

# Run on specific browser
npm run test:e2e -- --project=chromium
```

### View Test Database
```bash
cd backend
DATABASE_URL=$TEST_DATABASE_URL npx prisma studio
```

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Check TEST_DATABASE_URL in .env.test
- Run migrations: `npx prisma migrate deploy`

### Timeout Errors
- Increase timeout in test config
- Check if application servers are running
- Review network conditions

### Import Errors
- Run `npm run install:all`
- Check that Prisma client is generated: `cd backend && npx prisma generate`

## Test Data Management

### Seeding Test Database
```bash
cd backend
DATABASE_URL=$TEST_DATABASE_URL npm run db:seed
```

### Using Test Factories
```typescript
import { createTestFactory } from "../factories";

const factory = createTestFactory(prisma);

// Create test user
const { user, password } = await factory.users.createAdmin();

// Create test customer
const customer = await factory.customers.create();

// Create test invoice with items
const invoice = await factory.invoices.createWithItems(customer.id, 3);

// Create complete scenario
const scenario = await factory.createBasicScenario();
```

## Coverage Reports

Coverage reports are generated in:
- `backend/coverage/` - Backend coverage
- `frontend/coverage/` - Frontend coverage

View HTML reports:
```bash
# Backend
open backend/coverage/lcov-report/index.html

# Frontend
open frontend/coverage/lcov-report/index.html
```

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure coverage thresholds are met
3. Update test documentation
4. Run all tests before committing

## Getting Help

- **Test Plan**: See `/tests/README_TEST_PLAN.md`
- **Assumptions**: See `/tests/ASSUMPTIONS.md`
- **TODOs**: See `/tests/TODO.md`
- **Issues**: Create a GitHub issue with `test` label

## Test Metrics

Current test suite statistics:
- **Integration Tests**: 26 test cases
- **E2E Tests**: 15+ test cases
- **Security Tests**: 15+ scenarios
- **Performance Tests**: 5 scenarios
- **Total**: 60+ test cases

Coverage goals:
- Backend: 90% statements, 85% branches
- Frontend: 80% statements, 75% branches

## Next Steps

See `/tests/TODO.md` for:
- Required CI/CD configuration
- Additional test coverage needed
- Performance testing improvements
- Security hardening tasks
