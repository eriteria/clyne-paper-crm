# Clyne Paper CRM - Comprehensive Test Plan

## Overview

This document describes the comprehensive test suite for the Clyne Paper CRM system, covering unit tests, integration tests, end-to-end tests, security testing, performance testing, and CI/CD integration.

## Test Coverage Goals

- **Backend Logic**: 90% code coverage minimum
- **Frontend Logic**: 80% code coverage minimum
- **API Endpoints**: 100% route coverage
- **Critical Business Flows**: 100% E2E coverage
- **Security Tests**: All OWASP Top 10 scenarios

## Repository Structure

```
tests/
├── README_TEST_PLAN.md          # This file
├── ASSUMPTIONS.md                # Documented assumptions
├── TODO.md                       # Manual intervention tasks
├── inventory.json                # Auto-generated component inventory
├── fixtures/                     # Test data and seeding
│   ├── seed-test-db.ts          # Database seeding script
│   ├── customers.json           # Sample customer data
│   ├── invoices.json            # Sample invoice data
│   └── users.json               # Sample user data
├── factories/                    # Test data factories
│   ├── customer.factory.ts
│   ├── invoice.factory.ts
│   ├── user.factory.ts
│   └── waybill.factory.ts
├── utils/                        # Test utilities
│   ├── testDb.ts                # Database helpers
│   ├── mockServer.ts            # Mock external services
│   └── helpers.ts               # Common test helpers
├── unit/                         # Unit tests
│   ├── backend/                 # Backend unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── middleware/
│   └── frontend/                # Frontend unit tests
│       ├── components/
│       ├── hooks/
│       └── utils/
├── integration/                  # Integration tests
│   ├── auth.test.ts
│   ├── customers.test.ts
│   ├── invoices.test.ts
│   ├── payments.test.ts
│   ├── inventory.test.ts
│   └── waybills.test.ts
├── e2e/                         # End-to-end tests
│   ├── playwright.config.ts
│   ├── auth/
│   ├── customers/
│   ├── invoices/
│   ├── payments/
│   ├── inventory/
│   └── waybills/
├── security/                     # Security tests
│   ├── auth-fuzzing.test.ts
│   ├── injection.test.ts
│   ├── zap-config.yaml
│   └── privilege-escalation.test.ts
├── perf/                        # Performance tests
│   ├── artillery-config.yml
│   ├── k6-load-test.js
│   └── dashboard-perf.test.ts
└── reports/                     # Generated reports
    ├── coverage/
    ├── junit/
    └── flakiness/
```

## Running Tests

### Prerequisites

1. **Environment Setup**:
   ```bash
   # Install dependencies
   npm run install:all
   
   # Set up test environment variables
   cp backend/.env.test.example backend/.env.test
   ```

2. **Test Database**:
   - Uses PostgreSQL (Docker recommended for local development)
   - Automatically created and seeded for integration and E2E tests
   - Connection string in `backend/.env.test`

### Unit Tests

```bash
# Run all unit tests
npm test

# Backend unit tests only
npm run test:backend:unit

# Frontend unit tests only
npm run test:frontend:unit

# With coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run integration tests (requires test database)
npm run test:integration

# Specific integration test suite
npm run test:integration -- auth.test.ts
```

### End-to-End Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui

# Run specific E2E suite
npm run test:e2e -- invoices

# Debug mode
npm run test:e2e:debug
```

### Security Tests

```bash
# Run all security tests
npm run test:security

# Run OWASP ZAP scan (requires ZAP installed or Docker)
npm run test:security:zap

# Authentication fuzzing
npm run test:security:auth
```

### Performance Tests

```bash
# Run performance tests with Artillery
npm run test:perf

# Run k6 load tests
npm run test:perf:k6

# Lighthouse performance audit
npm run test:perf:lighthouse
```

### Accessibility Tests

```bash
# Run accessibility tests
npm run test:a11y

# Axe-core checks integrated in E2E tests
npm run test:e2e -- --grep accessibility
```

## CI/CD Integration

### GitHub Actions Workflows

The test suite is integrated into GitHub Actions with the following workflows:

1. **Unit Tests** (`.github/workflows/unit-tests.yml`)
   - Runs on every push and PR
   - Tests backend and frontend separately
   - Generates coverage reports
   - Uploads coverage to Codecov

2. **Integration Tests** (`.github/workflows/integration-tests.yml`)
   - Runs on PR to main/develop branches
   - Spins up PostgreSQL service container
   - Runs database migrations
   - Seeds test data
   - Executes integration test suite

3. **E2E Tests** (`.github/workflows/e2e-tests.yml`)
   - Runs on PR to main branch
   - Uses Playwright with browsers installed
   - Runs against test deployment or local server
   - Captures screenshots and videos on failure

4. **Security Scans** (`.github/workflows/security-tests.yml`)
   - Scheduled daily on main branch
   - Runs OWASP ZAP security scan
   - Checks for dependency vulnerabilities (npm audit)
   - Reports critical issues as GitHub Issues

5. **Performance Tests** (`.github/workflows/perf-tests.yml`)
   - Runs on main branch merges
   - Baselines key metrics (Lighthouse scores, API response times)
   - Fails if performance regresses beyond threshold

### Coverage Requirements

- **Minimum Coverage**: 
  - Backend: 90% statements, 85% branches
  - Frontend: 80% statements, 75% branches
- **Coverage Reports**: 
  - HTML reports in `tests/reports/coverage/`
  - Summary posted as PR comment
  - Badge updated in README

### Test Status Checks

All PRs must pass:
- ✅ Unit tests (backend + frontend)
- ✅ Integration tests
- ✅ E2E tests (critical paths only for PRs)
- ✅ Linting and formatting
- ✅ Security scan (no critical vulnerabilities)
- ✅ Coverage threshold met

## Test Data Management

### Fixtures

Test fixtures are located in `tests/fixtures/` and provide deterministic, reproducible test data:

- **Seeding**: `npm run test:seed` populates the test database
- **Factories**: Use factory functions in `tests/factories/` to generate test data programmatically
- **Cleanup**: Test database is reset between test runs

### Mock Services

External services are mocked for testing:

- **Email (SMTP)**: Mock SMTP server captures emails without sending
- **Payment Gateway**: Mock payment responses for success/failure scenarios
- **Google Sheets API**: Recorded fixtures for import/export operations
- **File Storage**: Local filesystem mock for S3-like operations

Configuration in `tests/utils/mockServer.ts`

## Business Flow Test Coverage

### 1. Authentication & Authorization

- [x] User login (email/password)
- [x] Token generation and validation
- [x] Refresh token flow
- [x] Role-based access control (RBAC)
- [x] Permission validation for routes
- [x] Session management
- [x] Logout and token invalidation

### 2. Customer Management

- [x] Create customer
- [x] Update customer details
- [x] Soft delete customer
- [x] Restore deleted customer
- [x] Search and filter customers
- [x] Customer location assignment
- [x] Customer team assignment
- [x] Activity audit logging

### 3. Invoice Lifecycle

- [x] Create invoice (single line item)
- [x] Create invoice (multiple line items)
- [x] Apply discount
- [x] Issue credit note
- [x] Send invoice (email mock)
- [x] Mark invoice as paid
- [x] Partial payment handling
- [x] Invoice reversal
- [x] Invoice PDF generation

### 4. Payment Processing

- [x] Initiate payment
- [x] Payment gateway webhook (success)
- [x] Payment gateway webhook (failure)
- [x] Credit balance management
- [x] Refund processing
- [x] Dispute handling
- [x] Payment reconciliation

### 5. Inventory Management

- [x] Add inventory item
- [x] Receive stock at location
- [x] Transfer stock between locations
- [x] Pick stock for invoice/waybill
- [x] Stock adjustment
- [x] Low stock alerts
- [x] Negative stock prevention
- [x] Inventory valuation

### 6. Waybill Management

- [x] Create waybill
- [x] Assign driver/delivery personnel
- [x] Update waybill status (pending → in-transit → delivered)
- [x] Handle delivery failure
- [x] Process returns
- [x] Proof-of-delivery attachment upload
- [x] Waybill tracking

### 7. Team & User Management

- [x] Create user
- [x] Assign role
- [x] Set permissions
- [x] Team assignment
- [x] Location access control
- [x] User activation/deactivation
- [x] Password reset

### 8. Reporting & Analytics

- [x] Dashboard metrics
- [x] Sales reports
- [x] Inventory reports
- [x] Customer activity reports
- [x] Date range filtering
- [x] Export to CSV
- [x] Export to PDF

### 9. File Management

- [x] Upload customer logo
- [x] Upload invoice attachments
- [x] Upload proof-of-delivery
- [x] File size validation
- [x] File type validation
- [x] Virus scan simulation

### 10. Data Import/Export

- [x] Import customers from CSV
- [x] Import invoices from CSV
- [x] Import from Google Sheets
- [x] Export data to CSV
- [x] Validation error reporting
- [x] Bulk operations

## Edge Cases & Error Scenarios

Each business flow includes tests for:

- **Boundary Conditions**: Zero amounts, max values, empty strings
- **Invalid References**: Non-existent IDs, circular references
- **Concurrent Operations**: Race conditions, optimistic locking
- **Network Failures**: Timeouts, connection errors
- **Database Constraints**: Unique violations, foreign key errors
- **Authorization Failures**: Insufficient permissions, expired tokens
- **Validation Errors**: Missing required fields, invalid formats

## Security Testing Checklist

- [x] SQL Injection prevention
- [x] XSS (Cross-Site Scripting) prevention
- [x] CSRF protection
- [x] Authentication bypass attempts
- [x] Authorization/privilege escalation
- [x] Session hijacking
- [x] Brute-force protection (rate limiting)
- [x] JWT token validation
- [x] Sensitive data exposure
- [x] Audit logging for sensitive operations

## Performance Baselines

Critical endpoints performance targets:

| Endpoint | Target (p95) | Load Test |
|----------|-------------|-----------|
| GET /api/dashboard | < 500ms | 100 concurrent users |
| POST /api/invoices | < 1000ms | 50 concurrent users |
| GET /api/customers | < 300ms | 100 concurrent users |
| POST /api/payments | < 2000ms | 20 concurrent users |
| GET /api/inventory | < 400ms | 50 concurrent users |

## Accessibility Standards

- **WCAG 2.1 Level AA** compliance
- **Axe-core** automated checks
- **Lighthouse** accessibility score > 90
- Keyboard navigation support
- Screen reader compatibility

## Flakiness Management

Test flakiness is tracked and reported:

- **Threshold**: Tests failing > 20% of runs are flagged
- **Report**: `tests/reports/flakiness/report.json`
- **Retries**: Flaky tests auto-retry 2 times in CI
- **Mitigation**: Add wait conditions, fix race conditions, improve test isolation

## Debugging Test Failures

### Local Debugging

1. **Run single test**:
   ```bash
   npm test -- path/to/test.test.ts
   ```

2. **Enable verbose output**:
   ```bash
   DEBUG=* npm test
   ```

3. **Playwright debug mode**:
   ```bash
   npm run test:e2e:debug
   ```

4. **View test database**:
   ```bash
   npx prisma studio --schema=backend/prisma/schema.prisma
   ```

### CI Debugging

1. Check workflow logs in GitHub Actions
2. Download test artifacts (screenshots, videos, logs)
3. Review coverage reports
4. Check flakiness report for intermittent failures

## Maintenance & Extension

### Adding New Tests

1. **Unit Tests**: Add to appropriate directory under `tests/unit/`
2. **Integration Tests**: Create in `tests/integration/` with database cleanup
3. **E2E Tests**: Add to `tests/e2e/` using Playwright patterns
4. **Update Inventory**: Run `npm run test:inventory` to regenerate

### Updating Test Data

1. Modify fixtures in `tests/fixtures/`
2. Update factories in `tests/factories/`
3. Re-run seed script: `npm run test:seed`

### Test Code Standards

- Use descriptive test names: `it('should create invoice with multiple line items', ...)`
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests isolated (no shared state)
- Use factories for test data creation
- Mock external dependencies
- Add comments for complex test scenarios

## Required CI Secrets

The following secrets must be configured in GitHub repository settings:

### Database
- `TEST_DATABASE_URL`: PostgreSQL connection string for CI tests

### Authentication
- `JWT_SECRET`: Test JWT secret
- `JWT_REFRESH_SECRET`: Test refresh token secret

### External Services (Mock Mode)
- `SMTP_HOST`: Mock SMTP server (optional)
- `SMTP_PORT`: Mock SMTP port (optional)
- `GOOGLE_SHEETS_API_KEY`: (optional, uses mocks)
- `ZOHO_CLIENT_ID`: (optional, uses mocks)
- `ZOHO_CLIENT_SECRET`: (optional, uses mocks)

### Performance Testing
- `ARTILLERY_CLOUD_API_KEY`: (optional, for Artillery cloud reporting)

### Coverage Reporting
- `CODECOV_TOKEN`: (optional, for Codecov integration)

## Troubleshooting

### Common Issues

1. **Database Connection Failures**:
   - Ensure PostgreSQL is running
   - Check `TEST_DATABASE_URL` in `.env.test`
   - Verify database exists and migrations are applied

2. **Timeout Errors in E2E Tests**:
   - Increase timeout in `playwright.config.ts`
   - Check if application is properly started
   - Review network conditions

3. **Mock Service Issues**:
   - Ensure mock servers are started before tests
   - Check ports are not in use
   - Verify mock configurations

4. **Coverage Not Generated**:
   - Run tests with `--coverage` flag
   - Check `collectCoverageFrom` patterns in Jest config
   - Ensure source files are not in ignore list

## Support & Contact

For questions or issues with the test suite:

- **Documentation**: This file and linked docs
- **Issues**: Create a GitHub issue with `test` label
- **CI Failures**: Check workflow logs and artifacts

## Version History

- **v1.0.0** (2025-11-01): Initial comprehensive test suite implementation
  - 94 backend routes covered
  - 36 frontend pages covered
  - E2E tests for 10 critical business flows
  - CI/CD integration with GitHub Actions
  - Security and performance testing included
