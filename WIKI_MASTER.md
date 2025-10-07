# Clyne Paper CRM - Complete Documentation Wiki

Welcome to the comprehensive documentation for the Clyne Paper CRM System - a production-ready Customer Relationship Management system designed specifically for Clyne Paper Limited's tissue paper manufacturing business.

## 📋 Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [System Overview](#system-overview)
3. [Technology Stack](#technology-stack)
4. [Architecture Guide](#architecture-guide)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Frontend Guide](#frontend-guide)
8. [Development Workflow](#development-workflow)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)
11. [Project History](#project-history)

---

## 🚀 Quick Start Guide

### One Command Setup

To run both frontend and backend servers simultaneously:

```bash
npm run dev
```

This starts:

- Backend API server on `http://localhost:5000`
- Frontend Next.js app on `http://localhost:3000`

### Demo Credentials

```
Email: admin@clynepapers.com
Password: admin123
```

### Available Commands

```bash
# Installation & Setup
npm run install:all     # Install dependencies for all projects
npm run build           # Build both projects
npm run start          # Run production builds

# Database Operations
npm run db:migrate     # Run database migrations
npm run db:seed       # Seed database with sample data
npm run db:reset      # Reset database

# Development Tools
npm test              # Run tests for both projects
npm run lint          # Lint both projects
npm run type-check    # TypeScript compilation check
```

---

## 🎯 System Overview

### What is Clyne Paper CRM?

A comprehensive Customer Relationship Management system designed for Clyne Paper Limited's tissue paper manufacturing business. It centralizes all business operations into a unified platform.

### Core Features

- **📊 Dashboard Analytics** - Real-time business metrics and charts
- **👥 Customer Management** - Complete customer lifecycle management
- **📋 Invoice System** - Create, track, and manage invoices
- **💰 Payment Processing** - Payment tracking and credit management
- **📦 Inventory Control** - Multi-location stock management
- **🚚 Waybill Management** - Delivery tracking and processing
- **👨‍💼 Team Management** - User roles, teams, and permissions
- **📈 Reporting** - Business intelligence and analytics
- **🔐 Security** - Role-based access control and audit trails

### Business Value

**Before CRM:**

- Excel spreadsheets (error-prone, hard to share)
- Manual processes (time-consuming, inconsistent)
- Separate systems (no data integration)
- Paper records (difficult to track and analyze)

**After CRM:**

- Centralized data management
- Real-time business visibility
- Automated workflows
- Audit trails and compliance
- Multi-user collaboration
- Business intelligence insights

---

## 🛠 Technology Stack

### Backend Technologies

```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "language": "TypeScript",
  "database": "PostgreSQL",
  "orm": "Prisma",
  "authentication": "JWT",
  "validation": "Joi",
  "logging": "Winston",
  "testing": "Jest"
}
```

### Frontend Technologies

```json
{
  "framework": "Next.js 15",
  "library": "React 19",
  "language": "TypeScript",
  "styling": "TailwindCSS",
  "state": "React Query",
  "forms": "React Hook Form + Zod",
  "charts": "Recharts",
  "icons": "Lucide React"
}
```

### Infrastructure

```json
{
  "hosting": "Railway/Fly.io",
  "database": "Railway PostgreSQL",
  "cdn": "Vercel (Frontend)",
  "monitoring": "Built-in logging",
  "backup": "Automated daily backups"
}
```

### Why These Choices?

**TypeScript**: Type safety prevents runtime errors and improves maintainability  
**PostgreSQL**: ACID compliance for financial data, complex relationships  
**Prisma**: Type-safe queries, automatic migrations, prevents SQL injection  
**Next.js**: Server-side rendering, file-based routing, excellent performance  
**TailwindCSS**: Utility-first styling, consistent design system

---

## 🏗 Architecture Guide

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   Database      │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │              ┌─────────────────┐              │
        └──────────────►│   File Storage  │◄─────────────┘
                       │   (Local/Cloud) │
                       └─────────────────┘
```

### Backend Architecture

```
backend/
├── src/
│   ├── middleware/     # Authentication, CORS, Rate limiting
│   ├── routes/         # API endpoints (REST)
│   ├── services/       # Business logic layer
│   ├── utils/          # Helper functions and utilities
│   └── server.ts       # Express app configuration
├── prisma/
│   ├── schema.prisma   # Database schema definition
│   └── migrations/     # Database migration files
└── logs/               # Application logs
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and configurations
│   └── types/          # TypeScript type definitions
├── public/             # Static assets
└── docs/               # Frontend-specific documentation
```

---

## 📊 Database Schema

### Core Entity Relationships

The database schema is built around key business entities with strong referential integrity:

#### User Management

- **User**: System users (sales reps, managers, admins)
- **Role**: Permission levels (Admin, Manager, Sales Rep, Viewer)
- **Team**: Sales teams organized by region/product
- **Region**: Geographic or organizational divisions

#### Customer & Sales

- **Customer**: Business customers with contact information
- **Invoice**: Sales invoices with line items
- **InvoiceItem**: Individual products/services on invoices
- **Payment**: Traditional invoice payments
- **CustomerPayment**: New comprehensive payment system
- **PaymentApplication**: Links payments to specific invoices

#### Inventory & Products

- **Product**: Product catalog items
- **ProductGroup**: Product categories/families
- **InventoryItem**: Physical stock at specific locations
- **Location**: Physical locations (warehouses, branches)

#### Logistics

- **Waybill**: Delivery documents for inventory transfers
- **WaybillItem**: Individual items being transferred

#### Financial Management

- **Credit**: Customer credit balances from overpayments
- **CreditApplication**: Application of credits to invoices
- **TaxRate**: Configurable tax rates for invoicing

#### System Features

- **AuditLog**: Complete audit trail of all actions
- **ReportsCache**: Performance optimization for reports
- **QuickBooksExport**: Integration with accounting software

---

## 🔌 API Documentation

### Authentication Endpoints

```
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Customer Management

```
GET    /api/customers           # List customers with pagination
POST   /api/customers           # Create new customer
GET    /api/customers/:id       # Get customer details
PUT    /api/customers/:id       # Update customer
DELETE /api/customers/:id       # Delete customer
GET    /api/customers/:id/invoices  # Customer invoice history
```

### Invoice Management

```
GET    /api/invoices            # List invoices with filters
POST   /api/invoices            # Create new invoice
GET    /api/invoices/:id        # Get invoice details
PUT    /api/invoices/:id        # Update invoice
DELETE /api/invoices/:id        # Delete invoice
GET    /api/invoices/:id/pdf    # Generate PDF
POST   /api/invoices/:id/payments    # Record payment
```

### Inventory Management

```
GET    /api/inventory           # List inventory items
POST   /api/inventory           # Add inventory item
PUT    /api/inventory/:id       # Update inventory
POST   /api/inventory/:id/adjust    # Adjust stock levels
GET    /api/inventory/low-stock      # Low stock alerts
```

### Payment Management

```
GET    /api/payments            # List payments
POST   /api/payments            # Record payment
GET    /api/payments/:id        # Payment details
POST   /api/payments/:id/allocate   # Allocate to invoices
```

### Admin Functions

```
GET    /api/admin/users         # User management
POST   /api/admin/users         # Create user
GET    /api/admin/roles         # Role management
GET    /api/admin/teams         # Team management
GET    /api/admin/locations     # Location management
```

### Request/Response Format

All API endpoints use JSON format:

```javascript
// Request
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+1234567890"
}

// Success Response
{
  "success": true,
  "data": {
    "id": "cluid123",
    "name": "Customer Name",
    "email": "customer@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}

// Error Response
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format"
  }
}
```

---

## 🎨 Frontend Guide

### Page Structure

```
/                       # Dashboard (metrics, charts, alerts)
/customers              # Customer list and management
/customers/new          # Create new customer
/customers/[id]         # Customer details and history
/invoices               # Invoice list with filters
/invoices/new           # Create new invoice
/invoices/[id]          # Invoice details and actions
/inventory              # Inventory management
/payments               # Payment tracking
/reports                # Business reports and analytics
/admin                  # Administrative functions
/settings               # User preferences and config
```

### Component Architecture

#### Shared Components

```
components/
├── ui/                 # Basic UI primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Table.tsx
├── forms/              # Form components
│   ├── CustomerForm.tsx
│   ├── InvoiceForm.tsx
│   └── PaymentForm.tsx
├── charts/             # Chart components
│   ├── RevenueChart.tsx
│   └── SalesChart.tsx
├── layout/             # Layout components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── PageLayout.tsx
└── features/           # Feature-specific components
    ├── CustomerList.tsx
    ├── InvoiceTable.tsx
    └── PaymentTracker.tsx
```

#### State Management

The app uses React Query for server state and React's built-in state for UI state:

```typescript
// Server state (API data)
const { data: customers } = useQuery({
  queryKey: ['customers'],
  queryFn: () => apiClient.get('/customers')
});

// UI state (forms, modals)
const [isModalOpen, setIsModalOpen] = useState(false);
```

#### Form Handling

Forms use React Hook Form with Zod validation:

```typescript
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

const form = useForm({
  resolver: zodResolver(schema)
});
```

### Styling System

The app uses TailwindCSS with a custom design system:

```css
/* Color Palette */
--primary: #2563eb    /* Blue */
--secondary: #64748b  /* Slate */
--success: #059669    /* Green */
--warning: #d97706    /* Orange */
--error: #dc2626      /* Red */

/* Typography */
.heading-1: text-3xl font-bold
.heading-2: text-2xl font-semibold
.body: text-base
.caption: text-sm text-gray-600
```

---

## ⚙️ Development Workflow

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/eriteria/clyne-paper-crm.git
   cd clyne-paper-crm
   ```

2. **Install dependencies**

   ```bash
   npm run install:all
   ```

3. **Set up environment variables**

   ```bash
   # Backend (.env)
   DATABASE_URL="postgresql://user:pass@localhost:5432/clyne_crm"
   JWT_SECRET="your-secret-key"
   JWT_REFRESH_SECRET="your-refresh-secret"
   
   # Frontend (.env.local)
   NEXT_PUBLIC_API_URL="http://localhost:5000"
   ```

4. **Initialize database**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development servers**

   ```bash
   npm run dev
   ```

### Code Standards

#### TypeScript Configuration

Both frontend and backend use strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true
  }
}
```

#### Git Workflow

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes with descriptive commits
3. Push branch: `git push origin feature/new-feature`
4. Create pull request
5. Code review and merge

#### Commit Convention

```
feat: add customer import functionality
fix: resolve invoice calculation bug
docs: update API documentation
refactor: improve payment service structure
test: add unit tests for invoice module
```

---

## 🚀 Deployment Guide

### Production Environment

The system is designed to run on Railway.app with the following configuration:

#### Minimum Server Requirements

- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Database**: PostgreSQL 14+
- **Node.js**: 18+

#### Environment Variables

**Backend (.env)**

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="complex-secret-key"
JWT_REFRESH_SECRET="another-complex-secret"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="production"

# CORS
FRONTEND_URL="https://yourdomain.com"
```

**Frontend (.env.production)**

```bash
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_APP_ENV="production"
```

---

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues

**Problem**: `Can't connect to database`

**Solutions**:

1. Check DATABASE_URL format
2. Verify database is running
3. Check firewall settings
4. Validate credentials

```bash
# Test database connection
npx prisma db pull
```

#### JWT Authentication Errors

**Problem**: `Invalid token` or `Token expired`

**Solutions**:

1. Check JWT_SECRET configuration
2. Verify token expiration settings
3. Clear browser localStorage
4. Check system clock synchronization

#### Build Errors

**Problem**: TypeScript compilation errors

**Solutions**:

1. Run type checking: `npm run type-check`
2. Update dependencies: `npm update`
3. Clear cache: `npm run clean`
4. Restart TypeScript server in IDE

### Health Checks

The system includes health check endpoints:

```bash
# Backend health
curl http://localhost:5000/health

# Database health
curl http://localhost:5000/health/db
```

---

## 📈 Project History

### Development Timeline

#### Phase 1: Foundation (Completed ✅)

- ✅ Project setup and architecture design
- ✅ Database schema design and implementation
- ✅ Authentication system
- ✅ Basic CRUD operations
- ✅ Customer management system

#### Phase 2: Core Features (Completed ✅)

- ✅ Invoice management system
- ✅ Payment processing
- ✅ Inventory management
- ✅ Team and location management
- ✅ Dashboard with analytics

#### Phase 3: Advanced Features (Completed ✅)

- ✅ Waybill management
- ✅ Credit system
- ✅ Audit logging
- ✅ Report generation
- ✅ PDF generation

#### Phase 4: Optimization (Completed ✅)

- ✅ Performance optimization
- ✅ Code cleanup and refactoring
- ✅ TypeScript error resolution
- ✅ Production deployment
- ✅ Comprehensive documentation

### Recent Updates

#### Latest Cleanup (October 2024)

- **Removed 50+ development files** (39,271 lines of code)
- **Fixed 30+ TypeScript errors** in core production routes
- **Improved code maintainability** and reduced technical debt
- **Updated documentation** and created comprehensive guides

#### Key Achievements

- **Production-ready codebase** with full TypeScript compliance
- **Comprehensive test coverage** for critical business logic
- **Scalable architecture** supporting multi-tenant deployment
- **Complete audit trail** for financial compliance
- **Modern tech stack** with latest best practices

### Future Roadmap

#### Planned Enhancements

1. **Mobile App**: React Native companion app
2. **Advanced Reporting**: More business intelligence features
3. **Email Integration**: Automated invoice and payment emails
4. **Multi-currency Support**: International business support
5. **API Integrations**: Third-party accounting software

---

## 📞 Support & Resources

### Getting Help

1. **Documentation**: This wiki covers most topics
2. **Code Comments**: Inline documentation in source code
3. **Issue Tracker**: GitHub issues for bug reports
4. **Development Team**: Contact the development team

### Resources

- **GitHub Repository**: [https://github.com/eriteria/clyne-paper-crm](https://github.com/eriteria/clyne-paper-crm)
- **API Documentation**: Available at `/api/docs` when running locally

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Last Updated**: October 2024  
**Version**: 1.0.0  
**Maintainer**: Development Team

---

*This documentation is automatically generated and maintained. For the most up-to-date information, please refer to the source code and inline comments.*