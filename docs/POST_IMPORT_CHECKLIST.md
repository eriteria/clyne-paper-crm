# Post-Import Action Checklist

✅ = Completed | ⏳ = In Progress | ❌ = Not Started

## Immediate Actions (Do Today)

| Priority  | Task                                     | Status | Notes                               |
| --------- | ---------------------------------------- | ------ | ----------------------------------- |
| 🔴 HIGH   | Reset password for Joy Akinyele          | ❌     | Default: ChangeMe123!               |
| 🔴 HIGH   | Reset password for Amarachi Nwabu-Nwosu  | ❌     | Default: ChangeMe123!               |
| 🔴 HIGH   | Reset password for Godwin Omede          | ❌     | Default: ChangeMe123!               |
| 🔴 HIGH   | Reset password for Collins Osiobe        | ❌     | Default: ChangeMe123!               |
| 🔴 HIGH   | Reset password for Kamil Haruna          | ❌     | Default: ChangeMe123!               |
| 🔴 HIGH   | Reset password for Chimdia Okey-Ebere    | ❌     | Default: ChangeMe123!               |
| 🟡 MEDIUM | Fix 4 customer date parsing issues       | ❌     | See GOOGLE_SHEETS_IMPORT_RESULTS.md |
| 🟡 MEDIUM | Handle 3 missing customers from invoices | ❌     | See GOOGLE_SHEETS_IMPORT_RESULTS.md |

## This Week

| Priority  | Task                                                 | Status | Notes                                                |
| --------- | ---------------------------------------------------- | ------ | ---------------------------------------------------- |
| 🔴 HIGH   | Create inventory items for all 22 products           | ❌     | Required before adding invoice line items            |
| 🔴 HIGH   | Set up inventory at "Abuja Corporate Sales" location | ❌     | 299 customers here (80%)                             |
| 🔴 HIGH   | Set up inventory at "Factory" location               | ❌     | 72 customers here (19%)                              |
| 🟡 MEDIUM | Assign relationship managers to teams                | ❌     | Currently no team assignments                        |
| 🟡 MEDIUM | Assign relationship managers to regions              | ❌     | Currently no region assignments                      |
| 🟡 MEDIUM | Configure team-location mappings                     | ❌     | Run: npx ts-node src/scripts/setup-location-teams.ts |
| 🟢 LOW    | Review invoice balances (spot check 10-20)           | ❌     | Verify payment applications correct                  |
| 🟢 LOW    | Test relationship manager login                      | ❌     | After password reset                                 |

## This Month

| Priority  | Task                                | Status | Notes                               |
| --------- | ----------------------------------- | ------ | ----------------------------------- |
| 🟡 MEDIUM | Add line items to priority invoices | ❌     | Start with recent/large invoices    |
| 🟡 MEDIUM | Train relationship managers on CRM  | ❌     | Schedule training sessions          |
| 🟡 MEDIUM | Set up automated sync schedule      | ❌     | Daily or weekly?                    |
| 🟢 LOW    | Create user manual for sales team   | ❌     | Document common workflows           |
| 🟢 LOW    | Set up reporting dashboards         | ❌     | Sales metrics, outstanding balances |

## Detailed Instructions

### 1. Reset Relationship Manager Passwords

**Via CRM Admin Panel:**

1. Log in as admin
2. Go to Users → Manage Users
3. Find each relationship manager
4. Click "Reset Password"
5. Send new password to user (or let them set via email link)

**Via Direct Database Update (Emergency):**

```bash
cd backend
npx ts-node
```

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetPassword(email: string, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { passwordHash: hash },
  });
  console.log(`✅ Password reset for ${email}`);
}

// Example:
await resetPassword("joy.akinyele@clynepaper.com", "NewSecurePassword123!");
await prisma.$disconnect();
```

### 2. Fix Customer Date Issues

**Customers with unparseable dates:**

1. YELLOW DOOR APARTMENTS - "2nd June 2025" → Update to 2025-06-02
2. OLUWATOYIN OMONAIVE - "2nd June 2025" → Update to 2025-06-02
3. ADAUGO (FCMB PLAZA) - "29/04" → Determine correct year
4. MEDIX PLUS PHARMACY - "29/04/25" → Update to 2025-04-29

**How to fix:**

```bash
# Open Prisma Studio
cd backend
npm run db:studio
```

1. Navigate to Customer table
2. Search for customer by name
3. Update onboardingDate or lastOrderDate field
4. Save changes

### 3. Handle Missing Customers

**Invoices referencing non-existent customers:**

| Invoice | Customer Name      | Action Options                                |
| ------- | ------------------ | --------------------------------------------- |
| #1890   | FIRST BANK MAITAMA | Create new customer OR link to existing bank  |
| #3408   | Cosmos             | Link to "COSMOS SUPERMARKET" (ID: find in DB) |
| #3378   | GOD SUPERMARKET    | Link to "GOD FIRST SUPERMARKET" (likely typo) |

**Option A - Create Missing Customer:**

```typescript
await prisma.customer.create({
  data: {
    name: "FIRST BANK MAITAMA",
    locationId: "abuja-corporate-sales-id", // Get from Location table
    relationshipManagerId: "joy-akinyele-id", // Assign to RM
  },
});
```

**Option B - Link to Existing Customer:**

```typescript
// Update invoice to link to correct customer
await prisma.invoice.update({
  where: { invoiceNumber: "3408" },
  data: {
    customerId: "cosmos-supermarket-id",
    customerName: "COSMOS SUPERMARKET",
  },
});
```

### 4. Create Inventory Items

**For EACH product at EACH location:**

```bash
# Open CRM admin panel
# Go to Inventory → Add Inventory Item
```

**Example: CLYNE BATH TISSUE at Abuja Corporate Sales**

- SKU: `CBT-ACS-001`
- Name: CLYNE BATH TISSUE
- Unit: pack
- Unit Price: ₦5,500.00
- Current Quantity: 100
- Min Stock: 10
- Location: Abuja Corporate Sales

**Bulk Creation Script:**

```typescript
// backend/src/scripts/create-inventory-items.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createInventoryForAllLocations() {
  const products = await prisma.product.findMany();
  const locations = await prisma.location.findMany({
    where: {
      name: { in: ["Abuja Corporate Sales", "Factory"] },
    },
  });

  for (const product of products) {
    for (const location of locations) {
      await prisma.inventoryItem.create({
        data: {
          sku: `${product.name.substring(0, 3)}-${location.name.substring(
            0,
            3
          )}-${Math.random().toString(36).substring(7)}`,
          name: product.name,
          unit: "pack",
          unitPrice: 5000, // Default price - update later
          currentQuantity: 0,
          minStock: 10,
          locationId: location.id,
          productId: product.id, // If your schema has this relationship
        },
      });
      console.log(`✅ Created inventory: ${product.name} at ${location.name}`);
    }
  }

  await prisma.$disconnect();
}

createInventoryForAllLocations();
```

### 5. Assign Users to Teams

**Via Admin Panel:**

1. Go to Users → Manage Users
2. Click on user (e.g., Joy Akinyele)
3. Set Team: "Abuja Sales Team" (create if needed)
4. Set Region: "FCT Abuja" (create if needed)
5. Save

**Via Script:**

```typescript
// First create teams and regions if needed
const team = await prisma.team.create({
  data: { name: "Abuja Sales Team" },
});

const region = await prisma.region.create({
  data: { name: "FCT Abuja" },
});

// Then assign users
await prisma.user.update({
  where: { email: "joy.akinyele@clynepaper.com" },
  data: {
    teamId: team.id,
    regionId: region.id,
  },
});
```

### 6. Configure Team-Location Mappings

**Run existing setup script:**

```bash
cd backend
npx ts-node src/scripts/setup-location-teams.ts
```

This will:

- Create TeamLocation records linking teams to locations
- Enable proper access control (users only see customers in their team's locations)

---

## Quick Commands Reference

```bash
# Re-run Google Sheets import
cd backend
npm run sheets:import

# Verify import results
npx ts-node src/scripts/verify-import.ts

# Open database browser
npm run db:studio

# View backend logs
cat logs/error.log
cat logs/combined.log

# Test Google Sheets connection
npm run sheets:test
```

---

## Success Metrics

After completing all actions, verify:

- [ ] All 7 relationship managers can log in with new passwords
- [ ] At least 44 inventory items created (22 products × 2 main locations)
- [ ] All 7 users have team and region assignments
- [ ] Team-location mappings configured
- [ ] All 4 date issues resolved
- [ ] All 3 missing customer issues resolved
- [ ] Spot checked 10 invoices - balances correct
- [ ] Tested creating a new invoice with line items (should work now)

---

## Support & Troubleshooting

If issues arise:

1. **Check logs:** `backend/logs/error.log`
2. **Verify data:** Run `npx ts-node src/scripts/verify-import.ts`
3. **Review docs:** See `GOOGLE_SHEETS_IMPORT_RESULTS.md`
4. **Database access:** Use Prisma Studio at http://localhost:5555

---

**Last Updated:** After successful Google Sheets import
**Total Import:** 373 customers, 2,285 invoices, 894 payments
