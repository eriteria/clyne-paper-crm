# Sales Returns Implementation Guide

## Overview

The Clyne Paper CRM now includes a comprehensive sales returns system that allows you to process customer returns efficiently. This system supports partial returns, auto-restocking, and customer-specific return policies.

## Key Features

✅ **No Approval Required** - Sales staff can process returns immediately  
✅ **Partial Returns** - Return some items from an invoice, not all  
✅ **Multiple Returns** - Same invoice can have multiple return transactions  
✅ **Auto-Restock** - Good condition items automatically added back to inventory  
✅ **Customer-Specific Policies** - Each customer has their own return time limit  
✅ **Credit Note & Bank Transfer** - Flexible refund methods  
✅ **Quality Tracking** - Track return reasons and item conditions  
✅ **Complete Audit Trail** - Full history of who, what, when, why

## Database Schema

### SalesReturn Model
```
- returnNumber: Unique identifier (e.g., "RET-2025-0001")
- invoice: Link to original invoice
- customer: Customer information
- returnDate: When the return was initiated
- reason: Why items were returned
- notes: Additional comments
- items: Array of returned items
- totalAmount: Total refund amount
- refundMethod: "Credit Note" or "Bank Transfer"
- refundStatus: "Pending" or "Completed"
- restockStatus: "Pending", "Restocked", or "Not Restocked"
- processedBy: User who processed the return
- createdBy: User who initiated the return
```

### SalesReturnItem Model
```
- salesReturn: Parent return transaction
- inventoryItem: Product being returned
- productName: Item description
- sku: Product SKU
- quantityReturned: How many units returned
- unitPrice: Price per unit
- subtotal: Total for this line item
- condition: "Good", "Damaged", or "Defective"
- restocked: Boolean - was this item added back to inventory?
```

### Customer Model (Updated)
```
- returnPolicyDays: How many days customer can return items (default: 30)
```

## API Endpoints

### 1. List All Sales Returns
```http
GET /api/sales-returns
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `customerId` - Filter by customer
- `invoiceId` - Filter by invoice
- `refundStatus` - Filter by status (Pending/Completed)
- `startDate` - Filter returns from date
- `endDate` - Filter returns to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "returnNumber": "RET-2025-0001",
      "returnDate": "2025-10-11T00:00:00.000Z",
      "reason": "Damaged in transit",
      "totalAmount": 150.00,
      "refundMethod": "Credit Note",
      "refundStatus": "Pending",
      "restockStatus": "Pending",
      "customer": { ... },
      "invoice": { ... },
      "items": [ ... ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "pages": 1
  }
}
```

### 2. Get Sales Return by ID
```http
GET /api/sales-returns/:id
```

### 3. Create Sales Return
```http
POST /api/sales-returns
```

**Request Body:**
```json
{
  "invoiceId": "invoice-id-here",
  "reason": "Damaged in transit",
  "notes": "Box was wet, tissue paper damaged",
  "refundMethod": "Credit Note",
  "items": [
    {
      "inventoryItemId": "item-id",
      "productName": "Toilet Paper 2-ply",
      "sku": "TP-2PLY-500",
      "quantityReturned": 5,
      "unitPrice": 30.00,
      "condition": "Damaged"
    }
  ]
}
```

**Validations:**
- ✅ Invoice must exist
- ✅ Return period must not be exceeded (customer's returnPolicyDays)
- ✅ Quantity returned cannot exceed invoice quantity
- ✅ Previous returns are counted (can't return more than originally invoiced)
- ✅ All items must exist in the invoice

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "returnNumber": "RET-2025-0001",
    "returnDate": "2025-10-11T00:00:00.000Z",
    "reason": "Damaged in transit",
    "notes": "Box was wet, tissue paper damaged",
    "totalAmount": 150.00,
    "refundMethod": "Credit Note",
    "refundStatus": "Pending",
    "restockStatus": "Pending",
    "customer": { ... },
    "invoice": { ... },
    "items": [ ... ]
  }
}
```

### 4. Process Sales Return
```http
POST /api/sales-returns/:id/process
```

**What This Does:**
1. Checks each returned item's condition
2. If condition is "Good", adds quantity back to inventory
3. Marks items as restocked
4. Updates return status to "Completed"
5. Updates restock status

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Sales return processed successfully"
}
```

### 5. Get Returns for Invoice
```http
GET /api/sales-returns/invoice/:invoiceId
```

Returns all sales returns associated with a specific invoice.

## User Workflow

### Step 1: Initiate Return
1. Navigate to invoice details
2. Click "Return Items" button
3. Select items to return
4. Enter quantities (can be partial)
5. Select condition for each item:
   - **Good** - Will be restocked
   - **Damaged** - Won't be restocked
   - **Defective** - Won't be restocked
6. Enter return reason
7. Add notes (optional)
8. Select refund method
9. Submit return

### Step 2: System Validation
- Checks return period (customer's policy)
- Validates quantities
- Checks for previous returns
- Calculates total refund amount

### Step 3: Process Return
1. Sales staff reviews return
2. Clicks "Process Return"
3. System automatically:
   - Restocks good condition items
   - Updates inventory quantities
   - Marks return as completed
   - Generates credit note (if selected)

### Step 4: Follow-up
- Customer notified (future enhancement)
- Accounting processes refund
- Inventory updated automatically

## Return Reasons (Common)

- **Damaged in transit** - Items arrived damaged
- **Wrong product** - Incorrect item shipped
- **Quality issue** - Product defect or quality problem
- **Customer request** - Customer changed mind (within policy)
- **Overstocked** - Customer ordered too much
- **Expired/Near expiry** - Date-sensitive products

## Item Conditions

### Good
- Item is in sellable condition
- Can be restocked
- Will be added back to inventory
- No quality issues

### Damaged
- Item has physical damage
- Cannot be resold
- Will NOT be restocked
- May need disposal

### Defective
- Item has manufacturing defect
- Cannot be resold
- Will NOT be restocked
- Should be reported to supplier

## Customer Return Policies

Each customer has a `returnPolicyDays` field (default: 30 days).

**To update a customer's return policy:**
```http
PATCH /api/customers/:id
{
  "returnPolicyDays": 45
}
```

**Examples:**
- VIP customers: 60 days
- Standard customers: 30 days
- Wholesale customers: 15 days
- Cash customers: 7 days

## Reporting & Analytics (Future)

Track these metrics:
- Return rate by product
- Return rate by customer
- Most common return reasons
- Return value trends
- Quality control metrics
- Cost of returns

## Best Practices

### 1. Document Everything
Always add detailed notes explaining:
- What happened
- Customer conversation
- Photos (if applicable)
- Delivery/shipping issues

### 2. Inspect Before Processing
- Verify item condition matches customer claim
- Take photos if items are damaged
- Check packaging for damage

### 3. Restock Good Items Promptly
- Process returns quickly to get inventory back
- Good condition items = lost sales opportunity
- Update inventory counts immediately

### 4. Track Patterns
- If same product returns frequently → quality issue
- If same customer returns frequently → review account
- If same reason repeats → process improvement needed

### 5. Customer Communication
- Inform customer of return approval
- Explain refund timeline
- Provide credit note/refund reference

## Integration Points

### With Invoices
- Returns linked to original invoice
- Can view returns from invoice detail page
- Track return percentage per invoice

### With Inventory
- Auto-restocking updates quantities
- Location-aware (same location as original sale)
- Real-time inventory updates

### With Customers
- Return history per customer
- Custom return policies per customer
- Track customer return patterns

### With Financial
- Credit notes automatically generated
- Affects customer balance
- Bank transfer processing queue

## Security & Permissions

### Who Can Create Returns?
- Sales staff (USER role)
- Managers (MANAGER role)
- Admins (ADMIN role)

### Who Can Process Returns?
- Managers (MANAGER role)
- Admins (ADMIN role)

### Audit Trail
Every return tracks:
- Who created it
- When it was created
- Who processed it
- When it was processed

## Next Steps (Frontend Implementation)

1. **Returns List Page** - View all returns with filters
2. **Create Return Modal** - From invoice detail page
3. **Return Detail Page** - View full return information
4. **Process Return Button** - One-click processing
5. **Customer Return Policy** - Edit in customer form
6. **Return Analytics Dashboard** - Track metrics

## Summary

Your sales returns system is now:
- ✅ Flexible - Partial returns, multiple returns per invoice
- ✅ Intelligent - Customer-specific policies, auto-validation
- ✅ Efficient - No approval needed, auto-restocking
- ✅ Trackable - Complete audit trail
- ✅ Scalable - Supports high volume

The backend is complete and ready for frontend integration!
