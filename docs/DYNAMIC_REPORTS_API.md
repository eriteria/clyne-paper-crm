# Dynamic Reports API Guide

## Overview

The Dynamic Reports API (`POST /api/reports/query`) allows you to create flexible reports without writing new backend endpoints. You can query any data model with custom filters, grouping, and aggregations.

## Endpoint

```
POST /api/reports/query
Authorization: Bearer <token>
Content-Type: application/json
```

## Request Body Schema

```typescript
{
  model: string;              // Required: Model name to query
  filters?: {                 // Optional: Filter criteria
    startDate?: string;       // ISO date string
    endDate?: string;         // ISO date string
    dateField?: string;       // Field to filter dates on (default: "date")
    customerIds?: string[];   // Array of customer IDs
    teamIds?: string[];       // Array of team IDs
    locationIds?: string[];   // Array of location IDs
    productIds?: string[];    // Array of product/inventory item IDs
    statuses?: string[];      // Array of status values
    minAmount?: number;       // Minimum amount filter
    maxAmount?: number;       // Maximum amount filter
    amountField?: string;     // Field to filter amounts on (default: "totalAmount")
    search?: string;          // Text search (searches customerName, invoiceNumber)
  };
  groupBy?: string[];         // Fields to group by (for aggregated reports)
  aggregations?: string[];    // Aggregation operations: ["count", "sum:fieldName", "avg:fieldName", "min:fieldName", "max:fieldName"]
  include?: object;           // Relations to include (for detail queries)
  orderBy?: {                 // Sorting options
    field: string;
    direction: "asc" | "desc";
    aggregate?: string;       // For groupBy queries: "_count", "_sum", "_avg"
  };
  limit?: number;             // Max results (default: 1000, capped at 1000)
}
```

## Allowed Models

- `invoice` - Invoices/sales data
- `customerPayment` - Payment transactions
- `customer` - Customer records
- `inventoryItem` - Inventory/products
- `waybill` - Waybills/delivery notes
- `invoiceItem` - Line items on invoices
- `team` - Sales teams
- `location` - Business locations
- `product` - Product catalog (if using separate product table)
- `productGroup` - Product categories/groups

## Example Use Cases

### 1. Revenue by Location (Last 30 Days)

**Request:**
```json
POST /api/reports/query
{
  "model": "invoice",
  "filters": {
    "startDate": "2025-09-20",
    "endDate": "2025-10-20",
    "statuses": ["PAID", "PARTIALLY_PAID"]
  },
  "groupBy": ["locationId"],
  "aggregations": ["count", "sum:totalAmount", "avg:totalAmount"],
  "orderBy": {
    "aggregate": "_sum",
    "field": "totalAmount",
    "direction": "desc"
  }
}
```

**Response:**
```json
{
  "success": true,
  "model": "invoice",
  "queryType": "groupBy",
  "resultCount": 5,
  "data": [
    {
      "locationId": "loc-123",
      "_count": { "id": 45 },
      "_sum": { "totalAmount": 1250000 },
      "_avg": { "totalAmount": 27777.78 }
    },
    // ... more locations
  ]
}
```

### 2. Sales by Team Member (This Month)

**Request:**
```json
POST /api/reports/query
{
  "model": "invoice",
  "filters": {
    "startDate": "2025-10-01",
    "endDate": "2025-10-20",
    "teamIds": ["team-456"],
    "statuses": ["PAID", "PARTIALLY_PAID"]
  },
  "groupBy": ["billedByUserId"],
  "aggregations": ["count", "sum:totalAmount"],
  "orderBy": {
    "aggregate": "_sum",
    "field": "totalAmount",
    "direction": "desc"
  }
}
```

### 3. Total Revenue Summary (Actual Payments)

**Request:**
```json
POST /api/reports/query
{
  "model": "customerPayment",
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-10-20",
    "dateField": "paymentDate",
    "statuses": ["COMPLETED"]
  },
  "aggregations": ["count", "sum:amount", "avg:amount", "min:amount", "max:amount"]
}
```

**Response:**
```json
{
  "success": true,
  "model": "customerPayment",
  "queryType": "aggregate",
  "aggregation": {
    "_count": 234,
    "_sum": { "amount": 5670000 },
    "_avg": { "amount": 24230.77 },
    "_min": { "amount": 5000 },
    "_max": { "amount": 150000 }
  },
  "sampleRecords": [],
  "sampleCount": 0
}
```

### 4. Outstanding Invoices by Customer

**Request:**
```json
POST /api/reports/query
{
  "model": "invoice",
  "filters": {
    "statuses": ["OPEN", "PARTIAL"],
    "minAmount": 10000
  },
  "groupBy": ["customerId", "customerName"],
  "aggregations": ["count", "sum:totalAmount"],
  "orderBy": {
    "aggregate": "_sum",
    "field": "totalAmount",
    "direction": "desc"
  },
  "limit": 50
}
```

### 5. Product Sales Analysis

**Request:**
```json
POST /api/reports/query
{
  "model": "invoiceItem",
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-10-20",
    "dateField": "createdAt"
  },
  "groupBy": ["inventoryItemId"],
  "aggregations": ["count", "sum:quantity", "sum:lineTotal", "avg:unitPrice"],
  "orderBy": {
    "aggregate": "_sum",
    "field": "lineTotal",
    "direction": "desc"
  },
  "limit": 20
}
```

### 6. Customer Payment Behavior

**Request:**
```json
POST /api/reports/query
{
  "model": "customerPayment",
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-10-20",
    "statuses": ["COMPLETED"]
  },
  "groupBy": ["customerId", "paymentMethod"],
  "aggregations": ["count", "sum:amount"],
  "orderBy": {
    "aggregate": "_count",
    "field": "id",
    "direction": "desc"
  }
}
```

### 7. Low Stock Items by Location

**Request:**
```json
POST /api/reports/query
{
  "model": "inventoryItem",
  "filters": {
    "locationIds": ["loc-123", "loc-456"]
  },
  "groupBy": ["locationId"],
  "aggregations": ["count"],
  "limit": 100
}
```

Then filter client-side for `currentQuantity <= minStock`.

### 8. Invoice Status Distribution

**Request:**
```json
POST /api/reports/query
{
  "model": "invoice",
  "filters": {
    "startDate": "2025-10-01",
    "endDate": "2025-10-20"
  },
  "groupBy": ["status"],
  "aggregations": ["count", "sum:totalAmount"],
  "orderBy": {
    "aggregate": "_count",
    "field": "id",
    "direction": "desc"
  }
}
```

### 9. Team Performance Comparison

**Request:**
```json
POST /api/reports/query
{
  "model": "invoice",
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-10-20",
    "statuses": ["PAID", "PARTIALLY_PAID"]
  },
  "groupBy": ["teamId"],
  "aggregations": ["count", "sum:totalAmount", "avg:totalAmount"],
  "orderBy": {
    "aggregate": "_sum",
    "field": "totalAmount",
    "direction": "desc"
  }
}
```

### 10. Monthly Revenue Trend

To get monthly trends, group by date periods in your frontend after fetching daily/all data, or use the existing hardcoded reports. The dynamic query is best for cross-sectional analysis rather than time-series (though you can fetch all data and aggregate client-side).

## Frontend Integration Examples

### React Query Hook

```typescript
// hooks/useDynamicReport.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface DynamicReportRequest {
  model: string;
  filters?: any;
  groupBy?: string[];
  aggregations?: string[];
  include?: any;
  orderBy?: any;
  limit?: number;
}

export function useDynamicReport() {
  return useMutation({
    mutationFn: async (request: DynamicReportRequest) => {
      const response = await apiClient.post('/reports/query', request);
      return response.data;
    },
  });
}
```

### Usage in Component

```typescript
// components/CustomReportForm.tsx
import { useDynamicReport } from '@/hooks/useDynamicReport';

function CustomReportForm() {
  const { mutate: runReport, data, isLoading } = useDynamicReport();

  const handleSubmit = () => {
    runReport({
      model: 'invoice',
      filters: {
        startDate: '2025-10-01',
        endDate: '2025-10-20',
        statuses: ['PAID'],
      },
      groupBy: ['locationId'],
      aggregations: ['count', 'sum:totalAmount'],
    });
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={isLoading}>
        Run Report
      </button>
      
      {data && (
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Count</th>
              <th>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row: any) => (
              <tr key={row.locationId}>
                <td>{row.locationId}</td>
                <td>{row._count.id}</td>
                <td>₦{row._sum.totalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

## Combining with Existing Reports

The dynamic query endpoint complements existing hardcoded reports:

- **Use hardcoded reports** (`/api/reports/sales`, `/api/reports/executive`, etc.) for:
  - Complex multi-table joins
  - Time-series analysis with date binning
  - Reports with business logic calculations
  - Dashboard widgets that need consistent structure

- **Use dynamic query** (`/api/reports/query`) for:
  - Ad-hoc analysis with different filter combinations
  - Exploratory data analysis
  - Custom reports requested by users
  - Quick prototyping of new report ideas

## Performance Considerations

1. **Limit Results**: Always set a reasonable `limit` (default: 1000, max: 1000)
2. **Index Filtering**: Ensure database indexes exist on frequently filtered fields
3. **GroupBy Size**: Limit groupBy to 2-3 fields max for performance
4. **Aggregations**: Use aggregations instead of fetching all records when possible
5. **Date Ranges**: Always include date filters for large tables

## Security

- **Authentication Required**: All queries require valid JWT token
- **Model Whitelist**: Only predefined models can be queried
- **Result Limits**: Maximum 1000 results per query
- **No Raw SQL**: All queries use Prisma (prevents SQL injection)

## Error Handling

```json
{
  "success": false,
  "error": "Invalid model. Allowed models: invoice, customerPayment, ...",
  "details": "Stack trace (development only)"
}
```

## Next Steps

1. **Build a Report Builder UI**: Create a form-based interface for non-technical users
2. **Save Custom Reports**: Store frequently used query configurations
3. **Schedule Reports**: Add cron jobs to run reports automatically
4. **Export Options**: Add CSV/PDF export for query results
5. **Dashboard Widgets**: Use dynamic queries to power custom dashboard cards

## Related Documentation

- [Backend Architecture](./BACKEND_ARCHITECTURE_COMPLETE.md)
- [Financial Dashboard](./INVOICE_IMPLEMENTATION.md)
- [Prisma Schema](../backend/prisma/schema.prisma)
