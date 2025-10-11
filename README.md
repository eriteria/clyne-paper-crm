# Clyne Paper CRM

[![Doppler](https://img.shields.io/badge/secrets-managed%20by%20doppler-3C4FE0?logo=doppler&logoColor=white)](https://doppler.com/)

# Clyne Paper CRM System

A production-ready CRM system for Clyne Paper Limited tissue paper factory with comprehensive inventory tracking, sales management, user & team modeling, role-based access control, and dashboard analytics.

## 🚀 Quick Start

### One Command to Rule Them All

To run both frontend and backend servers simultaneously:

```bash
npm run dev
```

This will start:

- Backend API server on `http://localhost:5000`
- Frontend Next.js app on `http://localhost:3000`

### Other Available Commands

```bash
# Install dependencies for all projects
npm run install:all

# Build both projects
npm run build

# Run production builds
npm start

# Database commands
npm run db:migrate    # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database

# Testing
npm test             # Run tests for both projects

# Linting
npm run lint         # Lint both projects
```

## 🔐 Authentication Flow (Cookie-Based)

**Zoho OAuth login now uses secure HTTP-only cookies for authentication.**

### How it works

- When you log in via Zoho, the backend sets `accessToken` and `refreshToken` as secure, HTTP-only cookies.
- The frontend does **not** handle tokens directly—no tokens in localStorage or URL fragments.
- To get the current user, the frontend calls `/api/auth/profile` (which reads the cookie).
- Logout and token refresh are also handled via cookies.

### Local Development

1. Start both servers with Doppler-injected secrets:
   ```bash
   doppler run -- npm run dev
   ```
2. Log in via the frontend login page. You will be redirected after Zoho auth completes.
3. The frontend will automatically detect your session via cookies.

**Note:** If you change the backend domain/port, update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` and `FRONTEND_URL` in Doppler/`.env`.

---

## 🔑 Demo Credentials

```
Email: admin@clynepapers.com
Password: admin123
```

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install all dependencies at once
npm run install:all
```

### 2. Environment Setup

Copy environment files and configure:

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database connection and JWT secrets

# Frontend (create if needed)
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations (when database is ready)
npx prisma migrate dev --name init

# Seed the database with sample data
npm run db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend (Port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (Port 3000)
cd frontend
npm run dev
```

## 📊 System Features

### Core Modules

- **Inventory Management**: Track tissue paper products, stock levels, locations
- **Waybill System**: Record incoming stock from factory
- **Invoice Management**: Create sales invoices, automatically update inventory
- **User & Team Management**: Role-based access control
- **Regional Operations**: Support for Nigerian regions and multi-team structure
- **Reports & Analytics**: Sales performance, inventory status, team metrics
- **Audit Logging**: Track all critical operations

### User Roles

- **Admin**: Full system access, user management
- **Manager**: Team-level oversight, reports access
- **Team Leader**: Team management, sales oversight
- **Sales**: Create invoices, view inventory
- **Warehouse**: Manage inventory, process waybills
- **Viewer**: Read-only access to reports

## 🔐 Default Login Credentials

| Email                    | Password    | Role        |
| ------------------------ | ----------- | ----------- |
| admin@clynepaper.com     | password123 | Admin       |
| leader1@clynepaper.com   | password123 | Team Leader |
| sales1@clynepaper.com    | password123 | Sales       |
| warehouse@clynepaper.com | password123 | Warehouse   |

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)

```
backend/
├── src/
│   ├── routes/          # API endpoints
│   │   ├── auth.ts      # Authentication
│   │   ├── users.ts     # User management
│   │   ├── inventory.ts # Inventory operations
│   │   ├── invoices.ts  # Invoice management
│   │   ├── waybills.ts  # Waybill processing
│   │   └── reports.ts   # Reports & analytics
│   ├── middleware/      # Auth, validation, error handling
│   ├── utils/          # Utilities, logging
│   └── seeders/        # Database seeding
├── prisma/
│   └── schema.prisma   # Database schema
└── logs/               # Application logs
```

### Frontend (Next.js + TailwindCSS)

```
frontend/
└── src/
    └── app/            # Next.js 15 app router
        ├── login/      # Authentication pages
        ├── dashboard/  # Main dashboard
        ├── inventory/  # Inventory management
        ├── invoices/   # Invoice system
        ├── users/      # User management
        └── reports/    # Reports & analytics
```

## 🗃️ Database Schema

### Core Tables

- **users**: System users with roles and team assignments
- **roles**: Permission-based access control
- **teams**: Sales teams with regional assignments
- **regions**: Nigerian states/regions
- **inventory_items**: Product catalog with stock levels
- **waybills**: Incoming stock receipts
- **waybill_items**: Items received per waybill
- **invoices**: Sales transactions
- **invoice_items**: Line items per invoice
- **audit_logs**: System activity tracking

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### Inventory

- `GET /api/inventory` - List all items
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `GET /api/inventory/:id` - Get item details

### Invoices

- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice (updates inventory)
- `PUT /api/invoices/:id` - Update invoice
- `GET /api/invoices/:id` - Get invoice details

### Reports

- `GET /api/reports/sales` - Sales analytics
- `GET /api/reports/inventory/low-stock` - Low stock alerts
- `GET /api/reports/sales-per-person` - User performance

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Development

Both servers auto-reload on code changes:

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### Production (cPanel)

#### Option 1: Node.js (if supported)

1. Upload code to cPanel
2. Use cPanel "Setup Node.js App"
3. Install dependencies: `npm install --production`
4. Set environment variables
5. Start application

#### Option 2: PHP/Laravel Fallback

If cPanel doesn't support Node.js, a Laravel version will be provided with identical features.

## 📈 Business Rules

1. **Inventory Updates**:

   - Waybills increase stock quantities
   - Invoices decrease stock quantities
   - Low stock alerts when below minimum threshold

2. **Sales Attribution**:

   - Every invoice attributed to a salesperson
   - Team and region captured at sale time
   - Performance metrics calculated accordingly

3. **Access Control**:

   - Role-based permissions enforced
   - Team leaders see only their team's data
   - Sales users see only their own transactions

4. **Audit Trail**:
   - All critical operations logged
   - User actions tracked for compliance
   - Data changes preserved

## 💰 Currency & Localization

- Primary currency: Nigerian Naira (₦)
- All amounts display with 2 decimal places
- Date formats: DD/MM/YYYY
- Language: English

## 🔧 Configuration

### Environment Variables

**Backend (.env)**

```
DATABASE_URL=postgresql://user:pass@localhost:5432/clyne_crm
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5000
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

**Frontend (.env.local)**

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Clyne Paper CRM
```

## 📞 Support

For technical support or questions:

- Review the documentation in `/docs/`
- Check the API documentation (Swagger) at `/api/docs`
- Refer to the admin manual in `/docs/ADMIN_MANUAL.md`

## 📄 License

MIT License - see LICENSE file for details.

---

**Clyne Paper Limited CRM v1.0**  
_Tissue Paper Factory Management System_
