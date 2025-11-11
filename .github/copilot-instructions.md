# Clyne Paper CRM - AI Coding Agent Instructions

> This file provides comprehensive guidance for AI coding agents (like GitHub Copilot) working on the Clyne Paper CRM codebase. It covers project architecture, development patterns, coding conventions, and common tasks to help you understand and contribute to the codebase effectively.

## Project Architecture Overview

This is a **full-stack TypeScript CRM system** for Clyne Paper Limited (tissue paper manufacturing). The system uses a **monorepo structure** with separate backend and frontend applications that share common development workflows.

**Key Architecture:**

- **Backend**: Node.js + Express + Prisma ORM + PostgreSQL (port 5000)
- **Frontend**: Next.js 15 + React 19 + TailwindCSS + React Query (port 3000)
- **Database**: PostgreSQL with comprehensive business domain models
- **Authentication**: JWT-based with refresh tokens and role-based access control

## Essential Development Patterns

### Monorepo Commands (Run from root)

```bash
npm run dev                # Start both servers simultaneously
npm run install:all        # Install deps for all projects
npm run build              # Build both projects
npm run db:migrate         # Run Prisma migrations
npm run db:seed           # Seed with sample data
```

### Database Schema Understanding

The Prisma schema (`backend/prisma/schema.prisma`) defines a **comprehensive business domain** with these core entities:

- **Users** → **Teams** → **Locations** (hierarchical organization)
- **Customers** → **Invoices** → **Payments** (sales workflow)
- **InventoryItems** → **Waybills** (inventory management)
- **Products** → **ProductGroups** (catalog structure)

**Critical Pattern**: Location-based team assignments via `TeamLocation` junction table drive access control throughout the system.

### API Route Conventions

All backend routes follow **REST conventions** in `src/routes/`:

- Routes auto-import in `server.ts` with `/api` prefix
- Authentication middleware via `authenticate` from `middleware/auth`
- Consistent error handling with `errorHandler` middleware
- Request validation using Joi schemas

### Frontend Data Fetching Pattern

**React Query + Axios Pattern** used throughout:

```typescript
// Standard API client with auto token injection
import { apiClient } from "@/lib/api";

// Custom hooks for data fetching (see src/hooks/)
const { data, isLoading } = useQuery({
  queryKey: ["key"],
  queryFn: () => apiClient.get("/endpoint"),
});
```

### Component Architecture

- **App Router structure**: Each route in `src/app/[route]/page.tsx`
- **Shared components**: Generic UI components in `src/components/`
- **Custom hooks**: Business logic hooks in `src/hooks/`
- **Type safety**: Shared types in `src/types/index.ts`

## Critical Integration Points

### Authentication Flow

- Login → JWT tokens → HTTP-only cookies (secure storage) → Auto-injection via Axios interceptors
- Refresh token rotation on 401 responses
- Role-based route protection in frontend layout components

### Location-Team-Customer Assignment

This is the **most complex business logic**: Customers belong to locations, locations map to teams via `TeamLocation`, affecting data visibility and permissions throughout the system.

### Import/Export System

CSV import functionality for customers and invoices with validation and error reporting - see `backend/src/routes/import.ts` and related scripts.

## Project-Specific Conventions

### File Naming

- Backend: `kebab-case.ts` for routes, `camelCase.ts` for services
- Frontend: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Database: `snake_case` for columns, `camelCase` for Prisma models

### Error Handling

- Backend: Centralized error middleware with structured JSON responses
- Frontend: React Query error boundaries + toast notifications via `useNotifications`

### Development Workflow

1. **Database changes**: Modify schema → `npm run db:migrate` → Update types
2. **API development**: Add route → Update types → Frontend integration
3. **Testing**: Use provided test scripts in `backend/` directory (e.g., `test-*.js`)

## Key Files for Context

- `docs/BACKEND_ARCHITECTURE_COMPLETE.md` - Comprehensive backend guide
- `docs/FRONTEND_ARCHITECTURE_COMPLETE.md` - Frontend patterns and structure
- `backend/prisma/schema.prisma` - Complete data model
- `frontend/src/lib/api.ts` - API client configuration
- `backend/src/server.ts` - Server setup and route registration

## Debugging & Troubleshooting

- Backend logs: Check `backend/logs/` directory
- Database issues: Use Prisma Studio (`npx prisma studio`)
- Auth problems: Verify token storage in browser DevTools (Cookies tab - tokens stored in HTTP-only cookies)
- Import errors: Check validation in `backend/src/routes/import.ts`

When working with this codebase, always consider the **location-team-customer hierarchy** as it affects most business logic decisions.

## Environment Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Latest version recommended
- **PostgreSQL**: For local development database
- **Doppler CLI** (optional): For secret management

### Initial Setup Steps

1. **Clone and install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Configure environment variables**:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database URL and JWT secrets
   
   # Frontend (if needed)
   cp frontend/.env.production frontend/.env.local
   ```

3. **Setup database**:
   ```bash
   npm run db:migrate    # Run migrations
   npm run db:seed       # Seed with sample data
   ```

4. **Start development servers**:
   ```bash
   npm run dev           # Starts both backend (port 5000) and frontend (port 3000)
   ```

## Testing Conventions

### Backend Testing

- **Framework**: Jest + Supertest for API testing
- **Location**: `backend/tests/` directory
- **Structure**: 
  - `integration/` - API endpoint tests
  - `unit/` - Utility function tests
- **Test helpers**: Use `TestHelper` class from `tests/utils/testHelper`
- **Database**: Tests use separate test database (configured via `.env.test`)

**Run tests**:
```bash
cd backend && npm test              # Run all tests
cd backend && npm run test:watch    # Watch mode
cd backend && npm run test:coverage # With coverage
```

**Writing tests**:
- Use descriptive test names: `should login user with valid credentials`
- Clean up test data in `afterEach` or `afterAll` hooks
- Mock external services (email, Zoho OAuth)

### Frontend Testing

- **Framework**: Jest + React Testing Library
- **Location**: `frontend/__tests__/` directory
- **Focus**: Accessibility testing with jest-axe

**Run tests**:
```bash
cd frontend && npm test                      # Run all tests
cd frontend && npm run test:accessibility    # Accessibility tests only
```

## Code Style and Linting

### Backend

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Run linters**:
  ```bash
  cd backend && npm run lint        # Check for issues
  cd backend && npm run lint:fix    # Auto-fix issues
  cd backend && npm run format      # Format with Prettier
  ```

### Frontend

- **TypeScript**: Strict type checking
- **Linting**: ESLint with Next.js config
- **Styling**: TailwindCSS with utility-first approach
- **Run linters**:
  ```bash
  cd frontend && npm run lint       # Check for issues
  ```

**Style Preferences**:
- Use functional components with hooks (no class components)
- Prefer `const` over `let`, avoid `var`
- Use TypeScript interfaces for data structures
- Keep functions small and single-purpose
- Use meaningful variable names (avoid single letters except in loops)

## Security Considerations

### Authentication & Authorization

- **JWT Tokens**: Stored in HTTP-only cookies (never in localStorage)
- **Password Hashing**: Use bcrypt with proper salt rounds
- **Token Rotation**: Refresh tokens automatically rotate on use
- **Route Protection**: Always use `authenticate` middleware for protected routes
- **Role Checks**: Use `requirePermissions` middleware for authorization

### Data Validation

- **Input Validation**: Always validate with Joi schemas before processing
- **SQL Injection**: Use Prisma's parameterized queries (never string concatenation)
- **XSS Prevention**: React escapes output by default, but sanitize user HTML
- **File Uploads**: Validate file types and sizes (see `MAX_FILE_SIZE` in env)

### Environment Variables

- **Never commit**: Keep `.env` files in `.gitignore`
- **Production secrets**: Use Doppler for secret management
- **JWT Secrets**: Use strong, randomly generated secrets (32+ characters)
- **Database URLs**: Never expose in logs or error messages

## Common Development Tasks

### Adding a New API Endpoint

1. Create route file in `backend/src/routes/` (e.g., `widgets.ts`)
2. Define validation schema with Joi
3. Implement controller logic in the route handler
4. Add authentication middleware if needed
5. Route will auto-register via `server.ts` with `/api` prefix

### Adding a New Frontend Page

1. Create page in `frontend/src/app/[route]/page.tsx`
2. Create custom hook in `frontend/src/hooks/` for data fetching
3. Use `apiClient` from `@/lib/api` for API calls
4. Wrap API calls in React Query `useQuery` or `useMutation`
5. Add error handling and loading states

### Adding a New Database Model

1. Add model to `backend/prisma/schema.prisma`
2. Run migration: `npm run db:migrate`
3. Prisma types auto-generate on migration
4. Update seeders if needed in `backend/src/seeders/`

### Debugging Failed API Calls

1. Check backend logs in `backend/logs/` directory
2. Verify authentication tokens in browser DevTools (Cookies tab)
3. Check request/response in Network tab
4. Verify database connection with Prisma Studio: `npx prisma studio`
5. Check environment variables are properly loaded

### Working with Locations and Teams

The location-team-customer hierarchy is critical:
- Always filter data by user's assigned locations via `TeamLocation`
- When creating customers, verify location exists and user has access
- Use `getTeamLocations` utility to get user's accessible locations
- Test access control for all CRUD operations on location-scoped data
