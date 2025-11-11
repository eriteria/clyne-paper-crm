# Test Suite Assumptions

This document outlines assumptions made during the implementation of the comprehensive test suite for Clyne Paper CRM.

## Business Logic Assumptions

### Customer Management
- Customers can belong to only one location at a time
- Soft-deleted customers can be restored
- Customer email is optional but phone is required for invoicing
- Customer merge operations preserve the primary customer's ID

### Invoice Lifecycle
- Invoices are immutable once marked as PAID
- Credit notes create negative invoice amounts
- Partial payments are tracked separately in the Payment model
- Invoice numbers are auto-generated and sequential per location
- Currency is NGN (Nigerian Naira) by default

### Payment Processing
- Payment gateway webhooks are idempotent
- Failed payments can be retried
- Refunds are processed as negative payments
- Credit balances can be applied to future invoices
- Payment methods include: CASH, BANK_TRANSFER, CARD, CREDIT

### Inventory Management
- Stock levels can never go below zero (hard constraint)
- Inventory is tracked per location
- Stock transfers create two transactions (out from source, in to destination)
- First-In-First-Out (FIFO) costing is used for valuation
- Minimum stock levels trigger low-stock alerts

### Waybill Management
- Waybills track both receiving (from supplier) and transfers (between locations)
- Status flow: PENDING → PROCESSING → APPROVED → IN_TRANSIT → DELIVERED
- Failed deliveries transition to RETURNED status
- Proof-of-delivery is required for DELIVERED status
- Waybills can be edited only in PENDING status

### User & Team Management
- Users can belong to one team at a time
- Users can have access to multiple locations via UserLocation
- Team leaders have additional permissions within their team
- Inactive users cannot log in but data is preserved
- Password resets expire after 24 hours

### Role-Based Access Control
- Three primary roles: admin, manager, staff
- Admin has full system access (all permissions)
- Manager has read/write/approve permissions
- Staff has read/write permissions only
- Permissions are string-based and checked at route level

### Reporting & Analytics
- Dashboard metrics are calculated in real-time
- Date range filters default to current month
- Reports can be exported as CSV or PDF
- Large exports (>10,000 records) are paginated
- Analytics are cached for 5 minutes

## Technical Assumptions

### Database
- PostgreSQL is used for production and testing
- Test database is automatically seeded before integration tests
- Database migrations are idempotent
- Connection pooling is handled by Prisma
- Soft deletes use `deletedAt` timestamp field

### Authentication
- JWT tokens expire after 1 hour
- Refresh tokens expire after 7 days
- Tokens are stored in HTTP-only cookies (production) or localStorage (development)
- Password minimum length is 8 characters
- Passwords are hashed using bcrypt with 10 rounds

### API Behavior
- All API responses follow format: `{ success: boolean, data?: any, error?: string }`
- Rate limiting is 100 requests per 15 minutes per IP
- File uploads limited to 10MB
- API versioning is not yet implemented (all routes under `/api`)
- CORS is enabled for development frontend

### Frontend Behavior
- Next.js App Router is used (not Pages Router)
- React Query handles all server state
- Forms use React Hook Form with Zod validation
- Optimistic updates are used for mutation operations
- Loading states are shown for async operations

### External Integrations
- Email sending uses Nodemailer with SMTP
- Google Sheets API is used for bulk data import
- Zoho OAuth is optional authentication method
- All external services have mock implementations for testing
- Webhooks use retry logic with exponential backoff

### File Management
- Files are stored locally in development
- Production uses cloud storage (S3-compatible)
- Allowed file types: PDF, JPG, PNG, CSV
- Files are virus-scanned before storage (mocked in tests)
- File paths are relative to upload directory

### Performance
- API responses should be under 500ms for p95
- Database queries use appropriate indexes
- N+1 queries are avoided using Prisma includes
- Frontend code-splitting per route
- Images are optimized using Next.js Image component

## Test Environment Assumptions

### Test Database
- Fresh database is created for each test suite run
- Migrations are applied automatically
- Test data is deterministic (seeded with fixed values)
- Database is cleaned between test cases
- PostgreSQL service is available (Docker or local)

### Mock Services
- Mock SMTP server captures emails without sending
- Mock payment gateway always returns success unless explicitly set to fail
- Mock file storage uses local temporary directory
- Mock Google Sheets API returns fixed sample data
- Mocks can be configured per test for different scenarios

### CI/CD Environment
- GitHub Actions runners have Node 18+ installed
- PostgreSQL service container is available
- Playwright browsers are installed in CI
- Test artifacts (screenshots, videos) are uploaded on failure
- Coverage reports are generated and uploaded

### Test Data
- All test users have password "password123" unless specified
- Test customer emails follow pattern "customer{N}@test.com"
- Test invoice numbers follow pattern "INV-TEST-{timestamp}"
- Test data is created using factories (not hardcoded)
- Faker library provides realistic but deterministic data

### Timing & Concurrency
- Tests use explicit waits, not sleep
- Retry logic is implemented for flaky assertions
- Concurrent test execution is safe (isolated databases)
- Timeouts are generous (30s for integration, 60s for E2E)
- Race conditions are tested with parallel requests

## Security Assumptions

### Authentication & Authorization
- JWT signature is verified on every request
- Expired tokens are rejected
- Refresh tokens are single-use
- Rate limiting prevents brute-force attacks
- CSRF protection is enabled in production

### Input Validation
- All inputs are validated using Joi schemas
- SQL injection is prevented by Prisma parameterization
- XSS is prevented by React's default escaping
- File uploads are validated for type and size
- Path traversal is prevented in file operations

### Data Privacy
- Passwords are never logged or exposed
- Sensitive data is excluded from API responses
- Audit logs track all sensitive operations
- PII is handled according to data protection policies
- Deleted data is soft-deleted (recoverable)

### Infrastructure Security
- HTTPS is enforced in production
- Environment variables store secrets
- Database credentials are not committed to code
- API keys are rotated regularly
- Security headers are set (Helmet.js)

## Known Limitations

### Test Coverage
- Background jobs/cron tasks are not yet tested
- Real-time WebSocket functionality (if any) not fully covered
- Third-party service failures beyond mocking not tested
- Email template rendering not visually tested
- Mobile responsive design not tested in E2E

### Performance Testing
- Load tests simulate up to 100 concurrent users (not production scale)
- Database performance at scale not tested
- CDN and caching layers not included in tests
- Network latency variations not simulated
- Browser performance varies by machine

### Accessibility Testing
- Automated tools catch only ~30% of accessibility issues
- Manual testing by users with disabilities not included
- Screen reader compatibility tested with basic scenarios
- Keyboard navigation tested for main flows only
- Color contrast checked by automated tools

### Browser Support
- E2E tests run on Chromium, Firefox, and WebKit
- Older browser versions not tested
- Mobile browsers tested using emulation only
- Browser-specific bugs may not be caught
- Performance varies significantly by browser

## Future Enhancements

The following improvements are planned but not yet implemented:

1. **Visual Regression Testing**: Screenshot comparison for UI changes
2. **Contract Testing**: API contract validation with consumers
3. **Chaos Engineering**: Failure injection and resilience testing
4. **Synthetic Monitoring**: Production health checks
5. **User Journey Analytics**: Real user monitoring integration
6. **Mutation Testing**: Code coverage quality assessment
7. **Database Migration Testing**: Forward and rollback scenarios
8. **Multi-tenant Testing**: If multi-tenancy is added
9. **Internationalization Testing**: If i18n is added
10. **Mobile App Testing**: If mobile apps are developed

## Clarifications Needed

The following areas may require clarification from the development team:

1. **Credit Note Business Rules**: Exact workflow for issuing and applying credit notes
2. **Payment Gateway Integration**: Specific gateway API (Stripe, Paystack, etc.)
3. **Email Template Design**: Required fields and branding for invoice emails
4. **File Storage Strategy**: S3 bucket structure and access policies
5. **Audit Log Retention**: How long to keep audit logs
6. **Report Performance**: Expected volume of data for reporting
7. **Waybill Driver Assignment**: Workflow for assigning and notifying drivers
8. **Customer Merge Conflicts**: Resolution strategy for conflicting data
9. **Regional Differences**: Location-specific business rules or tax handling
10. **Backup & Recovery**: Testing of backup and restore procedures

---

**Note**: These assumptions are based on code analysis and common CRM patterns. If any assumptions are incorrect, please update this document and adjust the relevant tests accordingly.
