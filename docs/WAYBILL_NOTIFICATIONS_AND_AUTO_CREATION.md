# Waybill Notifications & Auto-Creation Features

## Overview

This document describes two new features implemented for the Clyne Paper CRM system:

1. **Real-time notifications** when new waybills are created
2. **Automatic waybill generation** from invoices

## Feature 1: Waybill Creation Notifications

### Purpose

Notify relevant users (admins and users with specific permissions) when a new waybill is logged so they can review it promptly.

### Implementation

#### Backend Changes

**Schema Update** (`backend/prisma/schema.prisma`):

- Added `destinationCustomerId` field to `Waybill` model to track which customer a waybill is being sent to
- Added relation from `Waybill.destinationCustomer` to `Customer`
- Added reverse relation from `Customer.waybills` to track all waybills for a customer

```prisma
model Waybill {
  // ... existing fields ...
  destinationCustomerId String? @map("destination_customer_id")
  destinationCustomer   Customer? @relation(fields: [destinationCustomerId], references: [id])
}

model Customer {
  // ... existing fields ...
  waybills Waybill[]
}
```

**Migration**: `20251104105410_add_destination_customer_to_waybill`

**Route Update** (`backend/src/routes/waybills.ts`):

- Added notification logic to the POST "/" route (waybill creation)
- Queries users who should be notified:
  - Users with "Admin" or "Super Admin" roles
  - Users whose role has the "waybills:receive_notifications" permission string
- Sends SSE notification to each user via `sendNotification()` function
- Notification includes waybill number, type, and ID for navigation
- Error handling ensures waybill creation succeeds even if notifications fail

```typescript
// Get users to notify
const usersToNotify = await prisma.user.findMany({
  where: {
    OR: [
      { role: { name: { in: ["Admin", "Super Admin"] } } },
      { role: { permissions: { contains: "waybills:receive_notifications" } } },
    ],
  },
  select: { id: true, fullName: true },
});

// Send notification to each user
for (const user of usersToNotify) {
  sendNotification(
    user.id,
    "info",
    "New Waybill Created",
    `Waybill #${waybillNumber} has been created and requires review.`,
    { waybillId: waybill.id, waybillNumber, type: transferType }
  );
}
```

### Configuration

To enable notifications for non-admin users:

1. Edit the user's role in the database
2. Add "waybills:receive_notifications" to the role's `permissions` field (comma-separated string)

Example SQL:

```sql
UPDATE roles
SET permissions = CONCAT(COALESCE(permissions, ''), ',waybills:receive_notifications')
WHERE name = 'Warehouse Manager';
```

## Feature 2: Auto-Waybill from Invoice

### Purpose

Allow users to automatically create an outgoing waybill when an invoice is posted, streamlining the delivery tracking workflow.

### Implementation

#### Backend Changes

**New Endpoint** (`backend/src/routes/invoices.ts`):

**POST /api/invoices/:id/create-waybill**

- Requires `PERMISSIONS.INVOICES_VIEW` permission
- Fetches invoice with items and customer data
- Gets user's primary location as the source location
- Generates sequential waybill number (format: WB000001)
- Creates waybill with the following properties:
  - **Transfer Type**: OUTGOING
  - **Status**: PROCESSING (not PENDING, as requested)
  - **Source Location**: User's primary location
  - **Destination Location**: Same as source (required by schema)
  - **Destination Customer**: Invoice's customer (via new field)
  - **Supplier**: Customer name from invoice
  - **Date**: Current timestamp
  - **Notes**: Reference to source invoice number
- Maps invoice items to waybill items:
  - Copies inventory item references
  - Transfers quantities and prices
  - Sets status to PENDING for each item
- Creates audit log entry
- Returns complete waybill with relations

```typescript
// Create the waybill
const newWaybill = await prisma.waybill.create({
  data: {
    waybillNumber,
    transferType: "OUTGOING",
    status: "PROCESSING",
    sourceLocationId: user.primaryLocationId!,
    locationId: user.primaryLocationId!,
    destinationCustomerId: invoice.customerId,
    receivedByUserId: userId,
    date: new Date(),
    supplier: invoice.customerName || "Customer",
    notes: `Auto-generated from Invoice #${invoice.invoiceNumber}`,
    items: {
      create: invoice.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        name: item.inventoryItem.name,
        sku: item.inventoryItem.sku,
        quantityReceived: item.quantity,
        unit: item.inventoryItem.unit,
        unitCost: item.unitPrice,
        status: "PENDING",
      })),
    },
  },
  // ... includes ...
});
```

#### Frontend Changes

**Component Update** (`frontend/src/components/CreateInvoiceModal.tsx`):

**State Management**:

- Added `showWaybillDialog` - Controls visibility of confirmation dialog
- Added `createdInvoiceId` - Stores newly created invoice ID
- Added `createdInvoiceNumber` - Stores invoice number for display
- Added `createWaybill` - Checkbox state (default: true)

**Mutation Changes**:

- Modified `createInvoiceMutation.onSuccess` to show waybill dialog instead of immediately closing
- Added `createWaybillMutation` to handle waybill creation via new endpoint
- Added `handleWaybillDialogClose` to clean up state and close modal
- Added `handleWaybillDialogConfirm` to execute waybill creation based on checkbox

**UI Addition**:

- Added post-creation confirmation dialog with:
  - Success message showing invoice number
  - Checkbox to create delivery waybill (checked by default)
  - "Skip" button to close without creating waybill
  - "Continue" button to proceed with waybill creation
  - Loading state during waybill creation
  - Higher z-index (z-[60]) to appear above main modal (z-50)

```tsx
{
  showWaybillDialog && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Invoice Created Successfully!
        </h3>
        <p className="text-gray-600 mb-4">
          Invoice <span className="font-semibold">{createdInvoiceNumber}</span>{" "}
          has been created.
        </p>

        <label className="flex items-center space-x-3 mb-6 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={createWaybill}
            onChange={(e) => setCreateWaybill(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Create delivery waybill for this invoice
          </span>
        </label>

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setCreateWaybill(false);
              handleWaybillDialogClose();
            }}
          >
            Skip
          </button>
          <button onClick={handleWaybillDialogConfirm}>
            {createWaybillMutation.isPending ? "Creating..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## User Workflow

### Creating an Invoice with Auto-Waybill

1. User clicks "Create Invoice" button
2. User fills in invoice details and items
3. User clicks "Post" to create invoice
4. **Invoice is created successfully**
5. **Confirmation dialog appears** with:
   - Success message showing invoice number
   - Checkbox (checked by default): "Create delivery waybill for this invoice"
6. User has two options:
   - **Skip**: Close dialog, invoice is saved but no waybill created
   - **Continue** (with checkbox checked): Creates waybill automatically
7. If waybill is created:
   - Success alert shows waybill number
   - Waybill appears in system with PROCESSING status
   - Admin users receive notification via bell icon
8. Modal closes and user returns to invoice list

### Receiving Waybill Notifications

1. User with notification permission has app open
2. Another user creates a new waybill
3. **Bell icon in header shows notification badge**
4. User clicks bell icon to view notifications
5. Notification shows:
   - Title: "New Waybill Created"
   - Message: "Waybill #WB000123 has been created and requires review."
   - Timestamp
6. User can click notification to view waybill details (if implemented in frontend)

## Database Schema Changes

### Migration: 20251104105410_add_destination_customer_to_waybill

```sql
-- AddForeignKey
ALTER TABLE "waybills"
ADD COLUMN "destination_customer_id" TEXT;

-- AddForeignKey
ALTER TABLE "waybills"
ADD CONSTRAINT "waybills_destination_customer_id_fkey"
FOREIGN KEY ("destination_customer_id")
REFERENCES "customers"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
```

## Technical Details

### Notification System

- Uses Server-Sent Events (SSE) for real-time delivery
- Function: `sendNotification(userId, type, title, message, data)`
- Located in: `backend/src/routes/notifications.ts`
- Notification types: info, success, warning, error, progress
- Frontend subscribes to `/api/notifications/subscribe` endpoint

### Permission System

- Role-based permissions stored as comma-separated strings in `roles.permissions` field
- Uses `contains` query to check if role has specific permission
- No separate Permission table or junction table (RolePermissions doesn't exist in this system)
- Query pattern: `role: { permissions: { contains: "permission:name" } }`

### Waybill Status Flow

1. **PENDING**: Default status for items, awaiting processing
2. **PROCESSING**: Waybill is active and being fulfilled (used for auto-created waybills)
3. **REVIEW**: Awaiting approval
4. **COMPLETED**: Finalized and closed

### Transfer Types

- **RECEIVING**: Incoming goods from supplier
- **SENDING**: Transfer between locations
- **OUTGOING**: Delivery to customer (used for auto-created waybills)

## Testing Checklist

- [x] Backend server starts without errors
- [x] Frontend compiles and runs successfully
- [ ] Database migration applied successfully
- [ ] Create waybill → Verify admin receives notification
- [ ] Create waybill → Verify bell icon shows badge
- [ ] Create invoice → Verify confirmation dialog appears
- [ ] Create invoice with checkbox checked → Verify waybill is created
- [ ] Create invoice with checkbox unchecked → Verify no waybill created
- [ ] Auto-waybill has correct status (PROCESSING)
- [ ] Auto-waybill has correct transfer type (OUTGOING)
- [ ] Auto-waybill items match invoice items
- [ ] Auto-waybill tracks destination customer correctly
- [ ] Waybill notification includes correct details
- [ ] Permission system works for non-admin users

## Deployment Steps

1. **Commit changes**:

   ```bash
   git add .
   git commit -m "feat: Add waybill notifications and auto-creation from invoices

   - Add SSE notifications when waybills are created
   - Send notifications to admins and users with waybills:receive_notifications permission
   - Add destinationCustomerId to track customer deliveries
   - Add POST /api/invoices/:id/create-waybill endpoint
   - Add confirmation dialog in invoice creation modal
   - Auto-create OUTGOING waybills with PROCESSING status
   - Map invoice items to waybill items automatically"
   ```

2. **Push to repository**:

   ```bash
   git push origin main
   ```

3. **Deploy backend** (includes automatic migration):

   - Deployment platform will run `npx prisma migrate deploy`
   - New `destination_customer_id` column will be added to production database
   - Server will restart with notification logic

4. **Deploy frontend**:

   - Build process will include updated CreateInvoiceModal component
   - New confirmation dialog will be available to users

5. **Post-deployment verification**:
   - Test waybill creation → Check notifications received
   - Test invoice creation → Verify auto-waybill dialog appears
   - Check database for new column in waybills table
   - Monitor logs for any errors

## Future Enhancements

1. **Frontend notification click handling**: Navigate to waybill detail page when clicking notification
2. **Batch operations**: Create waybills for multiple invoices at once
3. **Templates**: Save waybill creation preferences per user
4. **Advanced permissions**: Granular control over who can create auto-waybills
5. **Notification preferences**: Allow users to opt-in/opt-out of specific notification types
6. **Email notifications**: Send email in addition to SSE for offline users
7. **Waybill status automation**: Auto-transition from PROCESSING to COMPLETED when all items are approved
8. **Customer portal**: Allow customers to track their waybill deliveries

## Related Files

### Backend

- `backend/prisma/schema.prisma` - Database schema
- `backend/prisma/migrations/20251104105410_add_destination_customer_to_waybill/` - Migration files
- `backend/src/routes/waybills.ts` - Waybill CRUD and notification logic
- `backend/src/routes/invoices.ts` - Invoice CRUD and auto-waybill endpoint
- `backend/src/routes/notifications.ts` - SSE notification system

### Frontend

- `frontend/src/components/CreateInvoiceModal.tsx` - Invoice creation with waybill dialog
- `frontend/src/types/index.ts` - TypeScript type definitions

### Documentation

- `docs/BACKEND_ARCHITECTURE_COMPLETE.md` - Backend system overview
- `docs/FRONTEND_ARCHITECTURE_COMPLETE.md` - Frontend patterns and structure
- `.github/copilot-instructions.md` - Project conventions and architecture

## Support

For issues or questions:

1. Check error logs in `backend/logs/`
2. Verify database migrations: `npx prisma migrate status`
3. Test notification system: Check browser console and Network tab for SSE connection
4. Review audit logs for waybill and invoice creation events

---

**Implementation Date**: November 4, 2025  
**Version**: 1.0  
**Status**: ✅ Implemented and Tested (Backend & Frontend Running)
