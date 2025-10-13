# Google Sheets Import - Schema Compatibility Issues

## ⚠️ Critical Schema Mismatch Discovered

After reviewing the actual Prisma schema, I've identified several compatibility issues between the Google Sheets import script and the current database schema.

## Issues Found

### 1. **User Creation**
**Problem**: Script uses `name` and `password`, but schema requires:
- `fullName` instead of `name`
- `passwordHash` instead of `password`  
- `roleId` (FK to Role table) instead of `role` string

**Impact**: Cannot create relationship manager users automatically

### 2. **Product/Inventory Structure**
**Problem**: The schema has a complex inventory system:
- `Product` → links to `ProductGroup` (required)
- `InventoryItem` → links to `Product` and `Location`
- `InvoiceItem` → links to `InventoryItem` (NOT directly to Product)

**Current Script**: Tries to create products directly and link invoices to products

**Impact**: Invoice items cannot be created without inventory items

### 3. **Customer Location Required**
**Problem**: `Customer.locationId` is REQUIRED in schema
**Current Script**: Treats it as optional

**Impact**: Customer creation will fail if location doesn't exist

### 4. **Invoice Required Fields**
**Missing from Google Sheets**:
- `billedByUserId` (User who created invoice) - Required
- `customerName` - Required (duplicate of Customer.name)
- `balance` - Required (remaining unpaid amount)

**Impact**: Fixed in latest version, but needs testing

### 5. **Payment Model Mismatch**
**Problem**: There are TWO payment models:
- `Payment` → links directly to Invoice (old system)
- `CustomerPayment` → links to Customer, then to Invoices via `PaymentApplication`

**Current Script**: Now uses `CustomerPayment` (correct)

## Recommendations

### Option A: Simplify Import (Recommended)
**Import only Customers initially**, then:
1. Create products and inventory manually in CRM
2. Enter new invoices through CRM UI
3. Use Google Sheets sync only for customer updates

**Pros**:
- Avoids complex inventory/product creation
- Ensures data integrity
- Users learn CRM system

**Cons**:
- Historical invoices not imported
- Manual product setup required

### Option B: Enhanced Import Script
**Extend the script** to handle full schema:
1. Create/find ProductGroups
2. Create Products with groups
3. Create InventoryItems for each product/location
4. Create proper InvoiceItems linking to inventory
5. Handle all required User fields with password hashing

**Pros**:
- Complete data migration
- All historical data preserved

**Cons**:
- Complex script (2-3x larger)
- More potential for errors
- Requires product group mapping

### Option C: Hybrid Approach (Best Balance)
**Phase 1: Import Reference Data**
- ✅ Customers (with locations)
- ✅ Relationship managers (simplified)
- ❌ Skip historical invoices
- ❌ Skip historical payments

**Phase 2: Setup CRM**
- Create product groups manually
- Create products with pricing
- Set up inventory per location
- Configure teams and regions

**Phase 3: Go Live**
- Start using CRM for new orders
- Keep Google Sheets for historical reference

## Immediate Action Required

### Fix Customer Import
The customer import should work but needs:

1. **Ensure all customers have locations**
2. **Create a default location** if location is missing
3. **Hash passwords** for relationship manager users
4. **Create Role records** before creating users

### Decision Needed

**Which approach do you prefer?**

- **A**: Simple customer-only import
- **B**: Full historical data import (complex)
- **C**: Hybrid (customers now, manual products, new invoices in CRM)

I recommend **Option C** as it balances data migration needs with CRM adoption.

## Next Steps

1. Review your decision on import scope
2. I'll update the script accordingly
3. Add proper error handling for schema constraints
4. Create helper scripts for manual setup (products, inventory)

---

**Note**: The current import script has been updated to fix the immediate issues, but invoice import will need schema adjustments or manual inventory setup first.
