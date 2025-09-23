# Clyne Paper CRM - AI Coding Agent Instructions

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

- Login → JWT tokens → `localStorage` storage → Auto-injection via Axios interceptors
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
- Auth problems: Verify token storage in browser localStorage
- Import errors: Check validation in `backend/src/routes/import.ts`

When working with this codebase, always consider the **location-team-customer hierarchy** as it affects most business logic decisions.
