# Customer Data Import Guide

## Overview

The CRM system now supports importing customer data from Excel files with **enhanced location-team mapping**. The system automatically assigns customers to teams based on their location, enabling location-based reporting and team management.

## Database Schema Updates

### Enhanced Customer Fields:

1. **location** (Text) - Maps to "LOCATION" column from Excel (preserved for compatibility)
2. **teamId** (Text) - **NEW**: Automatically assigned based on location
3. **onboardingDate** (DateTime) - Maps to "DATE OF ONBOARDING" column from Excel
4. **lastOrderDate** (DateTime) - Maps to "LAST ORDER DATE" column from Excel
5. **relationshipManagerName** (Text) - Temporary field to store manager names during import

### Enhanced Team Model:

1. **locationNames** (Array) - **NEW**: Locations this team covers
2. **customers** (Relation) - **NEW**: Direct relationship to customers

### Existing Fields That Map to Excel:

1. **name** - Maps to "CUSTOMER NAME" column
2. **address** - Maps to "ADDRESS" column
3. **relationshipManagerId** - Will be linked after import using "RELATIONSHIP MANAGER" column

## Excel Format Requirements

Your Excel file should have these exact column headers:

```
CUSTOMER NAME | RELATIONSHIP MANAGER | LOCATION | ADDRESS | DATE OF ONBOARDING | LAST ORDER DATE
```

### Example Data:

```
ABC Corporation | John Smith | Lagos | 123 Victoria Island, Lagos State | 01/15/2024 | 08/20/2025
XYZ Industries  | Jane Doe   | Abuja | 456 Central Business District, Abuja | 03/10/2024 | 08/25/2025
```

### Field Requirements:

- **CUSTOMER NAME**: Required, must be unique
- **RELATIONSHIP MANAGER**: Optional, should match existing user's full name
- **LOCATION**: Optional text field
- **ADDRESS**: Optional text field
- **DATE OF ONBOARDING**: Optional, accepts MM/DD/YYYY format
- **LAST ORDER DATE**: Optional, accepts MM/DD/YYYY format

## Import Process

### Recommended Import Strategy:

1. **Prepare Your Data**: Clean your Excel file to match the required format
2. **Import Users First**: Ensure all relationship managers exist as users in the system
3. **Clear Dummy Data**: Remove test data before importing real data
4. **Import Customers**: Import customer data (relationship managers stored as names)
5. **Link Relationship Managers**: Connect customers to users by matching names
6. **Update Last Order Dates**: Optionally update dates from actual invoice data

### Option 1: Manual Import (Recommended for First Time)

You can import step by step to ensure everything works correctly:

```bash
# 1. Clear dummy data
POST /api/import/clear-dummy-data

# 2. Import customers
POST /api/import/customers
{
  "data": [your excel data converted to JSON],
  "clearData": false
}

# 3. Link relationship managers
POST /api/import/link-relationship-managers

# 4. Update last order dates from invoices (after invoice import)
POST /api/import/update-last-order-dates
```

### Option 2: Full Automated Import

For a complete import process:

```bash
POST /api/import/full-process
{
  "data": [your excel data converted to JSON],
  "clearData": true
}
```

## API Endpoints

### GET /api/import/template

Returns the expected Excel format and example data.

### POST /api/import/clear-dummy-data

Safely removes all test/dummy data from the database while preserving structural data (users, teams, regions, roles).

### POST /api/import/customers

Imports customer data from Excel format.

```json
{
  "data": [
    {
      "CUSTOMER NAME": "ABC Corporation",
      "RELATIONSHIP MANAGER": "John Smith",
      "LOCATION": "Lagos",
      "ADDRESS": "123 Victoria Island, Lagos State",
      "DATE OF ONBOARDING": "01/15/2024",
      "LAST ORDER DATE": "08/20/2025"
    }
  ],
  "clearData": false
}
```

### POST /api/import/link-relationship-managers

Links customers to relationship managers by matching names with existing users.

### POST /api/import/update-last-order-dates

Updates customer last order dates based on actual invoice data in the system.

## Location-Team Mapping (NEW)

### Overview

The system now automatically assigns customers to teams based on their location during import. This enables:
- Location-based reporting
- Team-based customer management
- Hierarchical team structure with regions

### New API Endpoints

#### POST /api/import/setup-location-teams

Creates default teams for common locations (Lagos, Abuja, Port Harcourt, Kano, Ibadan).

```json
Response:
{
  "success": true,
  "data": {
    "created": 5,
    "existing": 0,
    "teams": [
      {"name": "Lagos Sales Team", "id": "...", "locations": ["Lagos"]},
      {"name": "Abuja Sales Team", "id": "...", "locations": ["Abuja"]}
    ]
  }
}
```

#### POST /api/import/assign-customers-to-teams

Assigns existing customers to teams based on their location.

```json
Response:
{
  "success": true,
  "data": {
    "assigned": 25,
    "unassigned": 3,
    "errors": [...]
  }
}
```

#### GET /api/import/location-mappings

Returns current location-to-team mappings and customer counts.

#### POST /api/import/add-location-mapping

Adds a new location to an existing team.

```json
Request:
{
  "location": "New Location",
  "teamName": "Existing Team Name"
}
```

### Import Process with Teams

1. **Setup Teams**: Run setup-location-teams to create default teams
2. **Import Customers**: Customers are automatically assigned to teams based on location
3. **Manual Assignment**: Use assign-customers-to-teams for existing customers
4. **Custom Mappings**: Add new location mappings as needed

### Benefits

- **Automatic Assignment**: New customers are automatically assigned during import
- **Reporting**: Generate reports by team/location
- **Team Management**: Team leaders can manage their location's customers
- **Scalability**: Easy to add new locations and teams

## Handling Relationship Managers

### Best Practices:

1. **Load Users First**: Import or ensure all relationship managers exist as users before linking
2. **Name Matching**: The system matches relationship manager names with user full names (case-insensitive)
3. **Unmatched Managers**: If a relationship manager name doesn't match any user, it's stored in `relationshipManagerName` field for later manual assignment
4. **Multiple Customers per Manager**: One user can be assigned to multiple customers

### Alternative Approach:

If you prefer to import customers without worrying about relationship managers initially:

1. Import all customers with relationship managers set to null
2. Manually assign relationship managers through the CRM interface later
3. Or import users first, then run the linking process

## Data Validation

The import system includes comprehensive validation:

- **Required Fields**: Customer name is required
- **Duplicate Prevention**: Prevents importing customers with duplicate names
- **Date Parsing**: Handles multiple date formats (MM/DD/YYYY, standard ISO dates)
- **Error Reporting**: Provides detailed error reports for failed imports
- **Rollback Safety**: Import failures don't affect existing data

## Safety Features

### Data Protection:

- All imports are transactional - if one record fails, it doesn't affect others
- Existing customer data is never overwritten without explicit confirmation
- Dummy data clearing only removes transactional data, not structural data
- Comprehensive logging of all import operations

### Testing:

- Test with small datasets first
- Use the sample data provided to validate your process
- The system provides detailed import summaries and error reports

## Converting Excel to JSON

To convert your Excel data to the required JSON format:

1. Export Excel to CSV
2. Use an online CSV to JSON converter
3. Or write a simple script to convert your data

Example conversion:

```javascript
// Your Excel row:
// "ABC Corporation", "John Smith", "Lagos", "123 Victoria Island", "01/15/2024", "08/20/2025"

// Becomes:
{
  "CUSTOMER NAME": "ABC Corporation",
  "RELATIONSHIP MANAGER": "John Smith",
  "LOCATION": "Lagos",
  "ADDRESS": "123 Victoria Island",
  "DATE OF ONBOARDING": "01/15/2024",
  "LAST ORDER DATE": "08/20/2025"
}
```

## Migration Commands

The database has been updated with a new migration. If you need to reset:

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate dev

# Check migration status
npx prisma migrate status
```

## Troubleshooting

### Common Issues:

1. **Relationship Manager Not Found**: Check user names match exactly, run linking process after user import
2. **Date Format Errors**: Ensure dates are in MM/DD/YYYY format or standard date format
3. **Duplicate Customer Names**: The system prevents duplicates - check for existing customers first
4. **Import Failures**: Check the error response for detailed information about failed records

### Getting Help:

The import system provides detailed logging and error reporting. Check the API response for specific error messages and row numbers that failed to import.

## Next Steps

After successfully importing customers:

1. **Verify Data**: Check that all customers imported correctly through the CRM interface
2. **Link Relationship Managers**: Run the linking process or manually assign managers
3. **Import Invoices**: Import historical invoice data if available
4. **Update Last Order Dates**: Refresh last order dates from actual invoice data
5. **User Training**: Train users on the new customer records and features

The system is now ready for production use with your existing customer data while supporting future enhancements and data fields.
