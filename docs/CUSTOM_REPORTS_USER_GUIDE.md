# Custom Reports User Guide

## Overview

The Custom Reports feature allows you to create flexible, ad-hoc reports without needing a developer to create new endpoints. You can filter, group, and aggregate data across multiple dimensions.

## Accessing Custom Reports

1. Navigate to **Reports** in the main menu
2. Click on the **Custom Reports** tab

## Quick Reports (Pre-configured Templates)

The Custom Reports page includes several pre-configured report templates for common use cases:

### 1. Revenue by Location (Last 30 Days)
Shows total revenue broken down by business location for the past month.
- **Groups by:** Location
- **Metrics:** Count, Total Revenue, Average Invoice Value
- **Time Period:** Last 30 days

### 2. Top Customers by Revenue  
Identifies your highest-value customers based on revenue.
- **Groups by:** Customer
- **Metrics:** Invoice Count, Total Revenue
- **Time Period:** Last 90 days
- **Limit:** Top 10 customers

### 3. Payment Method Analysis
Analyzes payment collection by payment method.
- **Groups by:** Payment Method
- **Metrics:** Count, Total Amount, Average Payment
- **Time Period:** Last 30 days

### 4. Invoice Status Summary
Shows distribution of invoices across different statuses.
- **Groups by:** Status
- **Metrics:** Count, Total Amount
- **Time Period:** Last 30 days

### 5. Sales by Team
Compares sales performance across teams.
- **Groups by:** Team
- **Metrics:** Count, Total Revenue, Average Sale
- **Time Period:** Last 30 days

## Building Custom Reports

### Step 1: Select Data Model

Choose what type of data you want to report on:
- **Invoices** - Sales data, invoice totals
- **Payments** - Payment transactions, collection data
- **Customers** - Customer information
- **Inventory** - Product stock levels
- **Waybills** - Delivery documentation
- **Invoice Items** - Line-item details

### Step 2: Set Date Range

Select the time period for your report:
- Start Date (optional)
- End Date (optional)
- Leave blank for all-time data

### Step 3: Choose Grouping

Select how to break down your data:
- **No Grouping** - Single aggregated total
- **Status** - By invoice/payment status
- **Customer** - By individual customer
- **Team** - By sales team
- **Location** - By business location
- **Payment Method** - By payment type

### Step 4: Select Metrics

Choose which metrics to calculate:
- ☑️ **Count** - Number of records
- ☑️ **Sum (Total Amount)** - Total revenue/amount
- ☑️ **Average (Total Amount)** - Average per record

### Step 5: Run Report

Click **"Run Report"** to generate your custom report.

## Understanding Results

### Grouped Reports
When you select grouping, results show one row per group:

Example (Revenue by Location):
```
Location ID | Count | Total Amount | Average
loc-001     | 45    | ₦1,250,000  | ₦27,778
loc-002     | 32    | ₦890,000    | ₦27,813
loc-003     | 28    | ₦760,000    | ₦27,143
```

### Aggregated Reports
When no grouping is selected, results show summary metrics:

Example (Total Revenue):
```
Count: 234
Sum: ₦5,670,000
Average: ₦24,231
```

## Exporting Results

Click the **"Export JSON"** button to download report results in JSON format for further analysis in Excel or other tools.

## Example Use Cases

### Use Case 1: Finding Slow-Paying Customers
**Goal:** Identify customers with many partial payments

**Configuration:**
- Model: `Invoice`
- Filters: Status = `PARTIAL`
- Group By: `Customer`
- Metrics: Count
- Date Range: Last 90 days

### Use Case 2: Analyzing Product Sales
**Goal:** See which products are selling best

**Configuration:**
- Model: `Invoice Items`
- Filters: Date range = This month
- Group By: `Inventory Item`
- Metrics: Count, Sum (Line Total)

### Use Case 3: Team Performance Comparison
**Goal:** Compare revenue across teams

**Configuration:**
- Model: `Invoice`
- Filters: Status = `PAID`, Date = This quarter
- Group By: `Team`
- Metrics: Count, Sum (Total Amount), Average (Total Amount)

### Use Case 4: Payment Collection Analysis
**Goal:** See how much was collected by payment method

**Configuration:**
- Model: `Customer Payment`
- Filters: Status = `COMPLETED`, Date = Last 30 days
- Group By: `Payment Method`
- Metrics: Count, Sum (Amount)

### Use Case 5: Location Revenue Trends
**Goal:** Compare performance across locations

**Configuration:**
- Model: `Invoice`
- Filters: Status = `PAID`, Date = Last 6 months
- Group By: `Location`
- Metrics: Count, Sum (Total Amount), Average (Total Amount)

## Advanced Tips

### Combining Filters
You can use multiple filters together:
- Date Range + Status + Location
- Customer + Date Range + Payment Method

### Date Field Selection
For some models, you can choose which date field to filter on:
- `date` - Invoice date (default)
- `createdAt` - Creation date
- `paymentDate` - Payment date (for payments)

### Result Limits
- Default limit: 100 results
- Maximum: 1000 results
- For large datasets, use date ranges to narrow results

## Troubleshooting

### "No results returned"
- Check your date range (might be too narrow)
- Verify status filters match your data
- Try removing filters one by one

### "Error: Invalid model"
- Make sure you selected a model from the dropdown
- The model name is case-sensitive

### Slow performance
- Add date range filters to narrow the query
- Limit grouping to 1-2 fields
- Reduce the result limit

## Getting Help

For questions or feature requests:
1. Check the **DYNAMIC_REPORTS_API.md** documentation
2. Contact your system administrator
3. View example queries in **DYNAMIC_REPORTS_IMPLEMENTATION.md**

## Future Enhancements

Planned features (coming soon):
- 📅 Scheduled reports (run automatically)
- 💾 Save custom report configurations
- 📧 Email report results
- 📊 Visual charts and graphs
- 📑 Export to CSV/Excel
- 🔗 Share report links
