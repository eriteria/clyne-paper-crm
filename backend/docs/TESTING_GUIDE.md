# Backend Testing Guide

## Overview

This guide outlines the comprehensive testing strategy for the Clyne Paper CRM backend application. We use **Jest** as our testing framework with **Supertest** for API testing and **TypeScript** support.

## Testing Strategy

### Testing Pyramid

1. **Unit Tests (70%)**: Test individual functions, utilities, and business logic
2. **Integration Tests (20%)**: Test API endpoints with database interactions
3. **End-to-End Tests (10%)**: Full user workflow tests (future implementation)

### Test Types

- **Unit Tests**: Fast, isolated tests for pure functions and business logic
- **Integration Tests**: Test API endpoints with real database interactions
- **Contract Tests**: Validate API responses and data schemas

## Project Structure

```
backend/
├── tests/
│   ├── setup.ts                 # Global test setup
│   ├── utils/
│   │   └── testHelper.ts        # Testing utilities
│   ├── unit/                    # Unit tests
│   │   ├── auth.unit.test.ts
│   │   ├── validation.unit.test.ts
│   │   └── services/
│   └── integration/             # Integration tests
│       ├── auth.test.ts
│       ├── customers.test.ts
│       ├── invoices.test.ts
│       └── inventory.test.ts
├── jest.config.js               # Jest configuration
└── .env.test.example           # Test environment variables
```

## Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,js}",
    "!src/**/*.d.ts",
    "!src/server.ts",
    "!src/seeders/**",
    "!src/scripts/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testMatch: ["**/__tests__/**/*.(ts|js)", "**/*.(test|spec).(ts|js)"],
  testTimeout: 30000,
};
```

### Environment Setup

1. Copy `.env.test.example` to `.env.test`
2. Update database connection for testing
3. Use separate test database to avoid data conflicts

## Test Database Setup

### Option 1: PostgreSQL (Recommended for CI/CD)

```bash
# .env.test
DATABASE_URL="postgresql://username:password@localhost:5432/clyne_paper_crm_test"
```

### Option 2: SQLite (Faster for local development)

```bash
# .env.test
DATABASE_URL="file:./test.db"
```

## Running Tests

### Local Development

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- customers.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create customer"
```

### CI/CD Environment

```bash
# Run tests for CI/CD (no watch, with coverage)
npm run test:ci
```

## Writing Tests

### Test Helper Usage

The `TestHelper` class provides utilities for common testing operations:

```typescript
import { TestHelper } from "../utils/testHelper";
import { createApp } from "../../src/app";

describe("API Tests", () => {
  let app: Express;
  let testHelper: TestHelper;

  beforeAll(async () => {
    app = createApp({ enableRateLimit: false });
    testHelper = new TestHelper(app);
  });

  it("should create and authenticate user", async () => {
    const { user, password } = await testHelper.createTestUser({
      email: "test@example.com",
      fullName: "Test User",
    });

    const token = testHelper.generateAuthToken(user.id, user.roleId);

    // Use token in requests
    await request(app)
      .get("/api/protected-route")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });
});
```

### Integration Test Pattern

```typescript
describe("POST /api/customers", () => {
  let authToken: string;
  let testLocation: any;

  beforeEach(async () => {
    // Setup test data
    testLocation = await testHelper.createTestLocation();
    const { user } = await testHelper.createTestUser({
      teamId: testTeam.id,
    });
    authToken = testHelper.generateAuthToken(user.id, user.roleId);
  });

  it("should create customer with valid data", async () => {
    const customerData = {
      name: "Test Customer",
      email: "customer@test.com",
      locationId: testLocation.id,
    };

    const response = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${authToken}`)
      .send(customerData)
      .expect(201);

    expect(response.body).toMatchObject({
      name: customerData.name,
      email: customerData.email,
      locationId: testLocation.id,
    });
    expect(response.body.id).toBeDefined();
  });

  it("should validate required fields", async () => {
    await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({}) // Empty data
      .expect(400);
  });
});
```

### Unit Test Pattern

```typescript
describe("Authentication Utils", () => {
  describe("validateEmail", () => {
    it("should accept valid email formats", () => {
      const validEmails = ["user@example.com", "test.email@domain.co.uk"];

      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it("should reject invalid formats", () => {
      const invalidEmails = ["invalid", "@domain.com", ""];

      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });
});
```

## Test Data Management

### Automatic Cleanup

The test setup automatically cleans the database between tests to ensure isolation:

```typescript
// tests/setup.ts
beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### Creating Test Data

Use TestHelper methods for consistent test data:

```typescript
// Create user with team and location
const testLocation = await testHelper.createTestLocation({
  name: "Test Location",
  code: "TEST001",
});

const testTeam = await testHelper.createTestTeam([testLocation.id]);

const { user } = await testHelper.createTestUser({
  teamId: testTeam.id,
  email: "user@test.com",
});

// Create customer linked to location
const customer = await testHelper.createTestCustomer({
  name: "Test Customer",
  locationId: testLocation.id,
});
```

## CI/CD Integration

### GitHub Actions Configuration

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/backend-tests.yml`) that:

1. Sets up PostgreSQL service
2. Installs dependencies
3. Runs database migrations
4. Executes all tests
5. Generates coverage reports
6. Uploads coverage to Codecov

### Coverage Requirements

- **Minimum Coverage**: 80% overall
- **Critical Paths**: 90% coverage for authentication, payments, and data integrity
- **Excluded Files**: Seeders, migration scripts, server.ts

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` for test data setup
- Clean database between tests
- Don't rely on test execution order

### 2. Descriptive Test Names

```typescript
// Good
it("should return 401 when token is missing");
it("should create customer with valid location assignment");

// Bad
it("should work");
it("test customer creation");
```

### 3. Arrange-Act-Assert Pattern

```typescript
it("should calculate total with tax", () => {
  // Arrange
  const items = [{ price: 100, quantity: 2 }];
  const taxRate = 0.1;

  // Act
  const total = calculateTotal(items, taxRate);

  // Assert
  expect(total).toBe(220); // 200 + 20 tax
});
```

### 4. Test Edge Cases

- Empty inputs
- Invalid data types
- Boundary values
- Error conditions
- Permission scenarios

### 5. Mock External Dependencies

```typescript
// Mock external services
jest.mock("nodemailer", () => ({
  createTransporter: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test" }),
  }),
}));
```

## Common Testing Scenarios

### Authentication Tests

```typescript
describe("Authentication", () => {
  it("should login with valid credentials", async () => {
    const { user, password } = await testHelper.createTestUser();

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password })
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.user.id).toBe(user.id);
  });

  it("should reject invalid credentials", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: "wrong@test.com", password: "wrong" })
      .expect(401);
  });
});
```

### CRUD Operations Tests

```typescript
describe("Customer CRUD", () => {
  it("should create, read, update, delete customer", async () => {
    // Create
    const createResponse = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${authToken}`)
      .send(customerData)
      .expect(201);

    const customerId = createResponse.body.id;

    // Read
    await request(app)
      .get(`/api/customers/${customerId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Update
    await request(app)
      .put(`/api/customers/${customerId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Updated Name" })
      .expect(200);

    // Delete
    await request(app)
      .delete(`/api/customers/${customerId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(204);
  });
});
```

### Validation Tests

```typescript
describe("Input Validation", () => {
  it("should validate email format", async () => {
    const invalidData = { ...validCustomerData, email: "invalid-email" };

    const response = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body.message).toContain("email");
  });
});
```

## Debugging Tests

### Common Issues

1. **Database Connection**: Ensure test database is running and accessible
2. **Environment Variables**: Verify `.env.test` is properly configured
3. **Async Operations**: Use `await` for all database operations
4. **Test Isolation**: Check for test interdependencies

### Debugging Commands

```bash
# Run single test with debugging
npm test -- --testNamePattern="specific test" --verbose

# Run tests without coverage for faster execution
npm test -- --coverage=false

# Run tests with detailed error output
npm test -- --verbose --detectOpenHandles
```

## Maintenance

### Updating Tests

- Update tests when API contracts change
- Maintain test data factories for schema changes
- Review coverage reports regularly
- Refactor tests to reduce duplication

### Performance Monitoring

- Monitor test execution time
- Optimize slow tests
- Use database transactions for speed
- Consider parallel test execution for large suites

This comprehensive testing setup ensures code quality, prevents regressions, and enables confident deployments to production.
