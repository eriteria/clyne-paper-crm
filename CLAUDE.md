# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack TypeScript CRM system for Clyne Paper Limited (tissue paper manufacturing). Monorepo structure with separate backend (Express + Prisma) and frontend (Next.js 15) applications.

## Essential Commands

### Development
```bash
# Start both servers simultaneously (from root)
npm run dev

# Start individual servers
npm run dev:backend      # Backend on port 5000
npm run dev:frontend     # Frontend on port 3000

# Install all dependencies
npm run install:all
```

### Database Operations
```bash
# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Reset database (destructive)
npm run db:reset

# Generate Prisma client (auto-runs on install)
cd backend && npx prisma generate

# View database in browser
cd backend && npx prisma studio
```

### Testing
```bash
# Run all tests
npm test

# Backend tests only
cd backend && npm test
cd backend && npm run test:watch      # Watch mode
cd backend && npm run test:coverage   # Coverage report

# Frontend tests only
cd frontend && npm test
```

### Building & Deployment
```bash
# Build both projects
npm run build

# Production mode
npm start

# Deploy setup (build + run migrations)
npm run deploy:setup
```

### Linting & Formatting
```bash
# Lint both projects
npm run lint

# Backend only
cd backend && npm run lint
cd backend && npm run lint:fix

# Format backend code
cd backend && npm run format
```

### Special Scripts
```bash
# Google Sheets integration
cd backend && npm run sheets:sync

# Update roles in production
cd backend && npm run update-roles:prod
```

## Architecture Overview

### Monorepo Structure
- **Root**: Workspace orchestration with concurrently
- **Backend**: `backend/` - Node.js + Express + Prisma ORM + PostgreSQL
- **Frontend**: `frontend/` - Next.js 15 + React 19 + TailwindCSS + React Query

### Backend Architecture (`backend/`)

**Entry Points:**
- `src/server.ts` - Server initialization with graceful shutdown
- `src/app.ts` - Express app factory with middleware & route registration

**Key Directories:**
- `src/routes/` - REST API endpoints (auto-prefixed with `/api`)
- `src/middleware/` - Auth, error handling, validation
- `src/utils/` - Utilities, logging, permissions system
- `src/seeders/` - Database seeding scripts
- `src/scripts/` - Maintenance/import utilities
- `prisma/` - Database schema and migrations

**Middleware Stack (in order):**
1. Helmet (security headers)
2. Compression
3. Cookie parser
4. Rate limiting (production only)
5. CORS (configured for frontend origins)
6. Body parsing (10MB limit)
7. Route handlers
8. 404 handler (`notFound`)
9. Error handler (`errorHandler`)

**Authentication:**
- JWT-based with refresh tokens
- `authenticate` middleware in `src/middleware/auth.ts`
- Tokens stored in localStorage on frontend
- Auto-refresh on 401 via Axios interceptors

### Frontend Architecture (`frontend/`)

**Structure:**
- App Router: `src/app/[route]/page.tsx`
- Shared Components: `src/components/`
- Custom Hooks: `src/hooks/`
- API Client: `src/lib/api.ts`
- Type Definitions: `src/types/index.ts`

**Data Fetching Pattern:**
- React Query + Axios throughout
- API client auto-injects JWT from localStorage
- Automatic token refresh on 401 responses

### Database Schema (`backend/prisma/schema.prisma`)

**Core Entity Relationships:**

```
Users → Teams → Locations (via TeamLocation junction)
  ↓
Customers → Invoices → InvoiceItems → InventoryItems
  ↓                 ↓
  Payments         SalesReturns
  Credits

Products → ProductGroups
         ↓
         InventoryItems (per Location)

Waybills → WaybillItems → InventoryItems
```

**Critical Business Logic:**
- **Location-Team Assignment**: `TeamLocation` junction table drives access control
- **Customers**: Belong to locations, locations map to teams
- **Inventory**: SKUs are location-specific (same SKU can exist in multiple locations)
- **Permissions**: Role-based with granular resource:action format

### Permission System

**Format**: `resource:action` (e.g., `customers:view`, `invoices:create`)

**Defined in**: `backend/src/utils/permissions.ts`

**Usage**:
```typescript
// Backend middleware
import { requirePermission } from '../middleware/auth';
router.get('/', requirePermission('customers:view'), handler);

// Frontend hook
import { usePermissions } from '@/hooks/usePermissions';
const { hasPermission } = usePermissions();
if (hasPermission('customers:create')) { ... }
```

**Key Permission Categories:**
- Customers, Invoices, Payments
- Users, Roles, Teams, Locations
- Products, Inventory, Waybills
- Reports, Audit Logs, Sales Targets
- Financial operations

## File Naming Conventions

- **Backend**: `kebab-case.ts` for routes, `camelCase.ts` for services
- **Frontend**: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Database**: `snake_case` columns, `camelCase` Prisma models

## Development Workflow

### Making Database Changes
1. Edit `backend/prisma/schema.prisma`
2. Run `npm run db:migrate` (creates migration & updates client)
3. Update TypeScript types if needed
4. Update seeders if adding required fields

### Adding a New API Endpoint
1. Create/update route in `backend/src/routes/`
2. Register route in `backend/src/app.ts` if new
3. Add middleware (`authenticate`, permission checks)
4. Update types in `frontend/src/types/`
5. Create/update API client calls in frontend

### Adding a New Frontend Page
1. Create `frontend/src/app/[route]/page.tsx`
2. Add to navigation if needed
3. Implement with React Query for data fetching
4. Use `usePermissions` hook for access control

## Important Integration Points

### Authentication Flow
1. Login → JWT tokens (access + refresh)
2. Store in localStorage
3. Auto-injection via Axios interceptor (`frontend/src/lib/api.ts`)
4. Auto-refresh on 401 responses
5. Redirect to `/login` on refresh failure

### Location-Team-Customer Hierarchy
**Most complex business logic in the system:**
- Customers belong to Locations
- Locations map to Teams via `TeamLocation` junction
- Affects data visibility and permissions throughout
- Users see data based on their team's location assignments

### Zoho OAuth Integration
- Development credentials in `.env.example`
- Routes: `backend/src/routes/auth-zoho.ts`
- Callback redirects to frontend after authentication
- Frontend pages: `/zoho-dev-signin`, `/zoho-auth-complete`

### Import/Export System
- CSV import for customers, invoices, payments
- Google Sheets integration via `backend/src/scripts/import-from-google-sheets.ts`
- Validation and error reporting
- Admin import routes: `backend/src/routes/admin-import.ts`

## Error Handling

**Backend:**
- Centralized error middleware in `backend/src/middleware/errorHandler.ts`
- Structured JSON responses: `{ success: false, error: "message" }`
- Winston logging to `backend/logs/`

**Frontend:**
- React Query error boundaries
- Toast notifications via `useNotification` hook
- Auto-logout on auth errors

## Environment Variables

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/clyne_paper_crm
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Optional: Zoho OAuth, SMTP, Google Sheets
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Testing

**Backend:**
- Jest + ts-jest + supertest
- Config: `backend/jest.config.js`
- Tests: `backend/tests/unit/**/*.test.ts`
- Setup: `backend/tests/setup-simple.ts`
- 30s timeout for DB operations

**Frontend:**
- Jest + Testing Library
- Accessibility tests with jest-axe

## Common Patterns

### API Routes
```typescript
// backend/src/routes/example.ts
import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

// Public endpoint
router.get('/public', handler);

// Authenticated endpoint
router.get('/private', authenticate, handler);

// Permission-gated endpoint
router.post('/', authenticate, requirePermission('resource:create'), handler);

export default router;
```

### Frontend Data Fetching
```typescript
// Custom hook pattern
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await apiClient.get('/customers');
      return response.data.data;
    },
  });
}

// In component
const { data: customers, isLoading } = useCustomers();
```

## Debugging Tips

- **Backend logs**: Check `backend/logs/` directory
- **Database inspection**: `cd backend && npx prisma studio`
- **Auth issues**: Verify tokens in browser localStorage
- **Import errors**: Check validation in `backend/src/routes/import.ts`
- **Permission errors**: Verify role permissions in database roles table

## BigInt Serialization

Backend has a custom BigInt serializer in `server.ts` to prevent JSON serialization errors:
```typescript
BigInt.prototype.toJSON = function() {
  const asNumber = Number(this);
  return Number.isSafeInteger(asNumber) ? asNumber : this.toString();
};
```

## Production Considerations

- Rate limiting automatically enabled in production (`NODE_ENV=production`)
- Trust proxy set to 1 for Fly.io deployment
- CORS configured for production domains
- Database migrations: Use `npm run migrate:deploy` (doesn't prompt)
- Environment variables managed via Doppler in production
