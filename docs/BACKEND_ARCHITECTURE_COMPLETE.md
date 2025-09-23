# Clyne Paper CRM Backend - Complete Architecture Guide

**A Comprehensive Guide for Beginners**

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Database Architecture](#database-architecture)
4. [Core Entities Explained](#core-entities-explained)
5. [API Routes & Endpoints](#api-routes--endpoints)
6. [Middleware & Security](#middleware--security)
7. [Services & Business Logic](#services--business-logic)
8. [Utilities & Helper Functions](#utilities--helper-functions)
9. [Data Flow & Relationships](#data-flow--relationships)
10. [Why Things Are Built This Way](#why-things-are-built-this-way)

---

## Project Overview

The Clyne Paper CRM Backend is a comprehensive Customer Relationship Management system built specifically for **Clyne Paper Limited**, a tissue paper manufacturing company. This system manages:

- **Sales Operations**: Invoices, payments, customer orders
- **Inventory Management**: Stock tracking across multiple locations
- **Team Management**: Sales teams, regions, user roles
- **Customer Relations**: Customer data, payment history, credits
- **Business Intelligence**: Sales targets, reporting, analytics

### Why This System Exists

Before this CRM, Clyne Paper likely managed their business using:

- Excel spreadsheets (hard to share, prone to errors)
- Manual processes (time-consuming, inconsistent)
- Separate systems (no data integration)
- Paper-based records (difficult to track, analyze)

This CRM centralizes everything into one system that multiple users can access simultaneously.

---

## Technology Stack

### Core Technologies

- **Node.js + TypeScript**: Server runtime with type safety
- **Express.js**: Web framework for building REST APIs
- **PostgreSQL**: Relational database for data persistence
- **Prisma ORM**: Database toolkit and query builder
- **JWT**: JSON Web Tokens for authentication

### Why These Choices?

**TypeScript over JavaScript**: Catches errors during development, makes code more maintainable

```typescript
// TypeScript prevents runtime errors like this:
interface User {
  id: string;
  email: string;
}
// If you try to access user.nome (typo), TypeScript will warn you
```

**PostgreSQL over MongoDB**:

- Financial data needs ACID transactions (money can't be lost!)
- Complex relationships between entities
- Strong data consistency requirements

**Prisma over Raw SQL**:

- Type-safe database queries
- Automatic database migrations
- Prevents SQL injection attacks

---

## Database Architecture

The database uses **Prisma Schema** to define all entities and relationships. Think of it as the blueprint for your data structure.

### Key Design Principles

1. **Referential Integrity**: Every foreign key points to a real record
2. **Audit Trail**: Track who did what and when
3. **Soft Deletes**: Mark records as inactive instead of deleting
4. **Normalization**: Avoid data duplication

---

## Core Entities Explained

Let's walk through every single entity and understand why it exists:

### 1. Role Entity

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  permissions String?
  users       User[]
}
```

**What it is**: Defines user permission levels (Admin, Manager, Sales Rep, etc.)

**Why it exists**:

- Not everyone should access everything
- Admins can see financial reports, regular users cannot
- Separates what users can do (authorization)

**Real-world example**:

- "Sales Rep" role: Can create invoices, view customers
- "Admin" role: Can do everything including user management

---

### 2. Region Entity

```prisma
model Region {
  id             String   @id @default(cuid())
  name           String   @unique
  parentRegionId String?  // Self-referencing for hierarchy
  users          User[]
  invoices       Invoice[]
}
```

**What it is**: Geographic divisions (Lagos, Abuja, Port Harcourt, etc.)

**Why it exists**:

- Clyne Paper operates in multiple locations
- Sales targets and reporting need regional breakdown
- Managers responsible for specific regions

**Hierarchy Support**:

- "Nigeria" (parent) → "Lagos State" (child) → "Ikeja" (grandchild)
- Allows flexible geographic organization

---

### 3. Team Entity

```prisma
model Team {
  id           String    @id @default(cuid())
  name         String    @unique
  leaderUserId String?   // Team leader
  customers    Customer[]
  members      User[]
  locations    TeamLocation[]
}
```

**What it is**: Sales teams within the company

**Why it exists**:

- Sales people work in teams
- Team leaders need to track their team's performance
- Customers are assigned to teams for better service

**Team-Location Relationship**: Teams can work in multiple locations, locations can have multiple teams

---

### 4. TeamLocation Entity (Junction Table)

```prisma
model TeamLocation {
  teamId     String
  locationId String
  team       Team     @relation(fields: [teamId], references: [id])
  location   Location @relation(fields: [locationId], references: [id])
  @@id([teamId, locationId]) // Composite primary key
}
```

**What it is**: Links teams to the locations they serve

**Why it's separate**:

- Many-to-many relationship (teams can serve multiple locations)
- Tracks when assignments were made
- Flexibility to reassign teams

---

### 5. User Entity

```prisma
model User {
  id                    String   @id @default(cuid())
  fullName              String
  email                 String   @unique
  passwordHash          String   // Never store plain passwords!
  roleId                String   // Links to Role
  teamId                String?  // Optional team membership
  regionId              String?  // Optional region assignment
  isActive              Boolean  @default(true) // Soft delete

  // Relationships
  managedCustomers      Customer[] @relation("CustomerRelationshipManager")
  invoices              Invoice[]
  recordedPayments      Payment[]
}
```

**What it is**: System users (employees, managers, admins)

**Why these fields**:

- `passwordHash`: Security - never store plain passwords
- `isActive`: Soft delete - deactivate instead of deleting users
- `roleId`: Determines what they can do
- `teamId/regionId`: Determines what data they can see

**Security Note**: Passwords are hashed using bcrypt before storage

---

### 6. Location Entity

```prisma
model Location {
  id           String          @id @default(cuid())
  name         String          @unique
  description  String?
  isActive     Boolean         @default(true)

  // What's stored here
  customers    Customer[]      // Customers in this location
  inventory    InventoryItem[] // Stock at this location
  waybills     Waybill[]       // Deliveries to this location
}
```

**What it is**: Physical business locations/warehouses

**Why it exists**:

- Clyne Paper has multiple warehouses
- Inventory is location-specific
- Customers are served from nearest location
- Different locations may have different stock levels

---

### 7. ProductGroup Entity

```prisma
model ProductGroup {
  id        String    @id @default(cuid())
  name      String    @unique
  products  Product[]
}
```

**What it is**: Categories of products (Toilet Paper, Kitchen Towels, Napkins)

**Why it exists**:

- Organize products logically
- Reporting by product categories
- Easier inventory management
- Sales analysis by product groups

---

### 8. Product Entity

```prisma
model Product {
  id                  String   @id @default(cuid())
  name                String
  productGroupId      String   // Links to ProductGroup
  monthlyTarget       Decimal  // Sales target for this product

  inventoryItems      InventoryItem[]      // Stock for this product
  monthlySalesTargets MonthlySalesTarget[] // Individual user targets
}
```

**What it is**: Specific products Clyne Paper manufactures

**Why monthly targets**: Sales teams need goals to work towards

**Product vs InventoryItem**:

- Product = "2-Ply Toilet Paper" (abstract concept)
- InventoryItem = "50 rolls of 2-Ply Toilet Paper at Lagos warehouse" (physical stock)

---

### 9. InventoryItem Entity

```prisma
model InventoryItem {
  id              String   @id @default(cuid())
  sku             String   @unique      // Stock Keeping Unit
  name            String
  unit            String               // "rolls", "packs", "boxes"
  unitPrice       Decimal
  currentQuantity Decimal              // How many we have
  minStock        Decimal              // Reorder level
  locationId      String               // Which warehouse

  invoiceItems    InvoiceItem[]        // Sales of this item
  waybillItems    WaybillItem[]        // Incoming stock
}
```

**What it is**: Physical stock items in specific locations

**Key Concepts**:

- **SKU**: Unique identifier for each item variant
- **Unit**: How it's measured (important for pricing)
- **minStock**: Automatic reorder alerts when stock is low
- **Location-specific**: Same product can be in multiple locations

**Why separate from Product**: Same product might have different prices/quantities at different locations

---

### 10. Customer Entity

```prisma
model Customer {
  id                    String    @id @default(cuid())
  name                  String
  email                 String?
  phone                 String?
  address               String?
  locationId            String    // Required - which location serves them
  companyName           String?
  contactPerson         String?
  relationshipManagerId String?   // Which sales rep manages them
  teamId                String?   // Which team serves them
  onboardingDate        DateTime? // When they became a customer
  lastOrderDate         DateTime? // Last purchase

  // Business relationships
  invoices              Invoice[]
  payments              CustomerPayment[]
  credits               Credit[]
}
```

**What it is**: Companies or individuals who buy from Clyne Paper

**Key Design Decisions**:

- `locationId` is required: Every customer must be served from a location
- `relationshipManagerId`: Personal relationship management
- `teamId`: Team-based customer service
- Separate payment tracking for better financial control

---

### 11. Invoice Entity (Complex but Important!)

```prisma
model Invoice {
  id                  String   @id @default(cuid())
  invoiceNumber       String   @unique
  date                DateTime
  customerId          String   // Who bought
  billedByUserId      String   // Who created the invoice
  teamId              String?  // Which team's sale
  regionId            String?  // Which region's sale
  totalAmount         Decimal
  balance             Decimal  // Remaining unpaid amount
  taxAmount           Decimal
  discountAmount      Decimal
  status              String   // DRAFT, OPEN, PARTIAL, PAID, CANCELLED

  // Line items and payments
  items               InvoiceItem[]        // What was sold
  payments            Payment[]            // How it was paid
  paymentApplications PaymentApplication[] // Payment allocation
  creditApplications  CreditApplication[]  // Credits applied
}
```

**What it is**: Bills sent to customers for goods sold

**Why it's complex**:

1. **Multiple payment methods**: Cash, bank transfer, etc.
2. **Partial payments**: Customers don't always pay full amount immediately
3. **Credits**: Overpayments, returns create credits for future use
4. **Tax calculation**: VAT must be tracked
5. **Team/Region tracking**: For sales performance analysis

**Status Flow**:

- DRAFT → Invoice being created
- OPEN → Sent to customer, awaiting payment
- PARTIAL → Some payment received
- PAID → Fully paid
- CANCELLED → Voided

---

### 12. InvoiceItem Entity

```prisma
model InvoiceItem {
  id              String   @id @default(cuid())
  invoiceId       String   // Which invoice
  inventoryItemId String   // What was sold
  quantity        Decimal
  unitPrice       Decimal  // Price at time of sale
  lineTotal       Decimal  // quantity × unitPrice
}
```

**What it is**: Individual line items on an invoice

**Why separate**:

- One invoice can have multiple products
- Track exact quantities and prices
- Historical pricing (prices change over time)

---

### 13. Payment System (Multiple Entities)

#### CustomerPayment (Main payment record)

```prisma
model CustomerPayment {
  id                  String   @id @default(cuid())
  customerId          String   // Who paid
  amount              Decimal
  paymentMethod       String   // CASH, BANK_TRANSFER, etc.
  paymentDate         DateTime
  referenceNumber     String?  // Bank reference, check number
  recordedByUserId    String   // Who recorded the payment
  status              String
  allocatedAmount     Decimal  // How much allocated to invoices
  creditAmount        Decimal  // How much became credit

  paymentApplications PaymentApplication[] // Which invoices this paid
}
```

#### PaymentApplication (Payment allocation)

```prisma
model PaymentApplication {
  id                String   @id @default(cuid())
  customerPaymentId String   // Which payment
  invoiceId         String   // Which invoice it paid
  amountApplied     Decimal  // How much of the payment went to this invoice
}
```

**Why this complexity**:

1. **Overpayments**: Customer pays 1000, invoice is 800, 200 becomes credit
2. **Underpayments**: Customer pays 800, invoice is 1000, balance remains
3. **Multiple invoices**: One payment can pay multiple invoices
4. **Audit trail**: Track exactly how money was allocated

**Real Example**:

- Customer pays $1000
- Invoice A = $300, Invoice B = $400, Invoice C = $200
- Remaining $100 becomes credit for future use

---

### 14. Credit System

```prisma
model Credit {
  id                String   @id @default(cuid())
  customerId        String   // Who has the credit
  amount            Decimal  // Original credit amount
  availableAmount   Decimal  // How much is left
  sourcePaymentId   String?  // Which payment created it
  reason            String   // OVERPAYMENT, RETURN, ADJUSTMENT
  status            String   // ACTIVE, APPLIED, EXPIRED
  expiryDate        DateTime? // Credits can expire

  creditApplications CreditApplication[] // Where credits were used
}
```

**What it is**: Money customers have with the company for future purchases

**Why credits exist**:

- Overpayments happen frequently
- Product returns need to be tracked
- Good customer service (credits instead of refunds)

---

### 15. Waybill System (Inventory Management)

```prisma
model Waybill {
  id               String   @id @default(cuid())
  waybillNumber    String   @unique
  date             DateTime
  supplier         String   // Who delivered
  locationId       String   // Where it was delivered
  status           WaybillStatus
  receivedByUserId String   // Who received it

  items            WaybillItem[] // What was delivered
}

model WaybillItem {
  id               String   @id @default(cuid())
  waybillId        String
  sku              String
  name             String
  quantityReceived Decimal
  unitCost         Decimal   // Purchase cost
  inventoryItemId  String?   // Links to inventory (after processing)
  status           WaybillItemStatus
}
```

**What it is**: Delivery receipts for incoming inventory

**Why it's separate from inventory**:

1. **Verification process**: Items need to be checked before adding to stock
2. **Quality control**: Some items might be rejected
3. **Cost tracking**: Purchase costs vs selling prices
4. **New product handling**: Unknown items need admin review

**Process Flow**:

1. Delivery arrives → Create Waybill
2. Staff checks items → Update quantities
3. Match to existing inventory or create new items
4. Update stock levels

---

### 16. Audit & Tracking

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  userId        String   // Who did it
  actionType    String   // CREATE, UPDATE, DELETE
  entityType    String   // Invoice, Customer, etc.
  entityId      String   // Which specific record
  previousValue String?  // What it was before
  currentValue  String?  // What it is now
}
```

**What it is**: Complete history of all changes in the system

**Why it's critical**:

- **Accountability**: Know who changed what
- **Debugging**: Track down when things went wrong
- **Compliance**: Financial regulations require audit trails
- **Security**: Detect unauthorized changes

---

### 17. Sales Targets & Performance

```prisma
model MonthlySalesTarget {
  id               String   @id @default(cuid())
  productId        String   // Which product
  userId           String   // Which sales person
  year             Int
  month            Int
  targetQuantity   Decimal  // How many units to sell
  achievedQuantity Decimal  // How many actually sold
  targetAmount     Decimal  // Revenue target
  achievedAmount   Decimal  // Actual revenue
}
```

**What it is**: Individual sales goals and performance tracking

**Why monthly**:

- Manageable timeframes for salespeople
- Regular performance reviews
- Seasonal business patterns

---

### 18. Reporting & Analytics

```prisma
model ReportsCache {
  id        String   @id @default(cuid())
  reportKey String   @unique
  data      String   // JSON report data
  expiresAt DateTime // When to refresh
}
```

**What it is**: Cached report data for performance

**Why cache reports**:

- Complex reports take time to generate
- Multiple users viewing same reports
- Reduce database load

---

## API Routes & Endpoints

The system has 22 different route files, each handling specific functionality:

### Authentication Routes (`/auth`)

- `POST /auth/login` - User login
- `POST /auth/register` - Create new user
- `POST /auth/logout` - End user session
- `GET /auth/me` - Get current user info

### User Management (`/users`)

- `GET /users` - List all users
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user

### Customer Management (`/customers`)

- `GET /customers` - List customers (with pagination)
- `POST /customers` - Add new customer
- `PUT /customers/:id` - Update customer
- `GET /customers/:id/invoices` - Customer's invoices
- `GET /customers/:id/payments` - Customer's payment history
- `GET /customers/:id/credits` - Customer's available credits

### Invoice Management (`/invoices`)

- `GET /invoices` - List invoices (filtered by user's access)
- `POST /invoices` - Create invoice
- `PUT /invoices/:id` - Update invoice
- `POST /invoices/:id/items` - Add invoice items
- `GET /invoices/:id/pdf` - Generate PDF invoice

### Payment Management (`/payments`)

- `POST /payments` - Record payment
- `GET /payments` - List payments
- `POST /payments/:id/allocate` - Allocate payment to invoices
- `POST /credits/:id/apply` - Apply credit to invoice

### Inventory Management (`/inventory`)

- `GET /inventory` - List inventory items
- `POST /inventory` - Add inventory item
- `PUT /inventory/:id` - Update inventory
- `GET /inventory/low-stock` - Items below minimum stock
- `POST /waybills` - Create delivery receipt
- `PUT /waybills/:id/process` - Process waybill items

### Reports (`/reports`)

- `GET /reports/sales-summary` - Sales performance
- `GET /reports/customer-aging` - Outstanding payments
- `GET /reports/inventory-status` - Stock levels
- `GET /reports/team-performance` - Team sales metrics

### Admin Functions (`/admin`)

- Database maintenance
- User role management
- System configuration
- Data import/export

---

## Middleware & Security

### 1. Authentication Middleware (`auth.ts`)

```typescript
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
```

**What it does**: Verifies user identity on every request

**Why it's important**: Prevents unauthorized access to data

### 2. Error Handling (`errorHandler.ts`)

Centralized error handling for consistent API responses

### 3. Rate Limiting

Prevents abuse by limiting requests per user per time period

### 4. Security Headers (Helmet)

Adds security headers to all responses

---

## Services & Business Logic

### Payment Service (`paymentService.ts`)

Complex payment processing logic:

- Validate payment amounts
- Allocate payments to invoices
- Handle overpayments and credits
- Update invoice balances
- Create audit logs

**Why a service layer**:

- Reusable business logic
- Consistent validation
- Transaction management
- Easier testing

---

## Utilities & Helper Functions

### 1. Logger (`logger.ts`)

Centralized logging using Winston:

- Different log levels (info, warning, error)
- File and console output
- Error tracking

### 2. Import Utilities

- Customer import from Excel/CSV
- Invoice import and validation
- User bulk import
- Data transformation helpers

### 3. Audit Logger (`auditLogger.ts`)

Automatically tracks changes to important entities

---

## Data Flow & Relationships

### Typical Sales Process Flow:

1. **Customer Creation**: Add customer to location/team
2. **Inventory Check**: Verify stock availability
3. **Invoice Generation**: Create invoice with line items
4. **Stock Update**: Reserve/reduce inventory
5. **Payment Recording**: Record customer payment
6. **Payment Allocation**: Allocate payment to invoices
7. **Credit Handling**: Handle overpayments as credits
8. **Reporting**: Update sales targets and generate reports

### Key Relationships:

- User → Role (many-to-one): Users have one role
- User → Team (many-to-one): Users belong to one team
- Team → Location (many-to-many): Teams serve multiple locations
- Customer → Location (many-to-one): Customers served from one location
- Invoice → InvoiceItem (one-to-many): Invoices have multiple line items
- Payment → PaymentApplication (one-to-many): Payments can pay multiple invoices

---

## Why Things Are Built This Way

### 1. Why Prisma ORM?

- **Type Safety**: Prevents runtime errors
- **Migration Management**: Database schema changes are tracked
- **Query Builder**: Complex queries made simple
- **Relationship Management**: Handles foreign keys automatically

### 2. Why JWT Authentication?

- **Stateless**: Server doesn't store session data
- **Scalable**: Works across multiple server instances
- **Secure**: Cryptographically signed tokens
- **Standard**: Widely adopted industry practice

### 3. Why Separate Payment and Invoice Entities?

- **Flexibility**: One payment can pay multiple invoices
- **Audit Trail**: Clear history of all financial transactions
- **Business Logic**: Handle partial payments, overpayments, refunds
- **Reporting**: Separate sales and collection reporting

### 4. Why Team-Location Junction Table?

- **Many-to-Many Relationship**: Teams can serve multiple locations
- **Flexibility**: Easy to reassign teams to different locations
- **Historical Data**: Track when assignments were made
- **Performance**: Efficient querying for team/location data

### 5. Why Soft Deletes (isActive field)?

- **Data Integrity**: Historical records remain intact
- **Audit Trail**: Know when records were "deleted"
- **Recovery**: Easy to reactivate accidentally deleted records
- **Relationships**: Foreign key references remain valid

### 6. Why Separate Credit System?

- **Customer Service**: Better than forcing refunds
- **Cash Flow**: Money stays within the business
- **Flexibility**: Credits can be applied to any future invoice
- **Expiration**: Credits can have expiry dates

### 7. Why Waybill Processing?

- **Quality Control**: Verify deliveries before adding to stock
- **Cost Tracking**: Track purchase vs sale prices
- **New Products**: Handle unknown items properly
- **Accountability**: Know who received what

---

## Security Considerations

### 1. Password Security

- Passwords are hashed using bcrypt (never stored plain)
- Strong password requirements enforced
- Password reset functionality with time-limited tokens

### 2. Data Access Control

- Role-based permissions (users see only what they should)
- Row-level security (users see only their team's data)
- API rate limiting to prevent abuse

### 3. Input Validation

- All input validated using Joi schemas
- SQL injection prevention through Prisma
- XSS protection through input sanitization

### 4. Audit Logging

- All important actions logged with user ID
- Immutable audit trail
- Regular audit log review capabilities

---

## Performance Optimizations

### 1. Database Indexing

- Primary keys and foreign keys automatically indexed
- Custom indexes on frequently queried fields
- Composite indexes for complex queries

### 2. Query Optimization

- Prisma includes/select to fetch only needed data
- Pagination on large datasets
- Efficient eager loading of related data

### 3. Caching

- Report caching for expensive operations
- Session caching for user authentication
- Static asset caching

---

## Monitoring & Maintenance

### 1. Logging

- Comprehensive error logging
- Performance monitoring
- User activity tracking

### 2. Database Maintenance

- Regular backup procedures
- Migration management
- Data archival strategies

### 3. Health Checks

- API endpoint monitoring
- Database connection monitoring
- System resource monitoring

---

## Future Scalability

### 1. Microservices Ready

- Clear service boundaries
- Independent data models
- API-first architecture

### 2. Multi-tenant Capable

- Location-based data isolation
- Role-based access control
- Configurable business rules

### 3. Integration Ready

- RESTful API design
- Webhook support capability
- Export/import functionality

---

## Conclusion

This CRM backend is designed as a comprehensive business management system that:

1. **Handles Complex Business Logic**: Multi-location, multi-team operations
2. **Maintains Data Integrity**: Proper relationships and constraints
3. **Provides Security**: Role-based access and audit trails
4. **Scales with Growth**: Flexible architecture for expansion
5. **Supports Decision Making**: Comprehensive reporting and analytics

The complexity reflects the real-world complexity of running a manufacturing and sales business. Each entity and relationship serves a specific business purpose, and the technical architecture supports the business requirements while maintaining performance, security, and maintainability.

Remember: This isn't just a technical system - it's a digital representation of how Clyne Paper Limited runs their business. Every table, every relationship, every API endpoint maps to real business processes and requirements.
