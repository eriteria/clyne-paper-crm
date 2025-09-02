# Location/Team Mapping Solution

## Problem Analysis

Currently:
- **Excel Import**: `LOCATION` column maps to customer `location` field (string)
- **Team Structure**: Existing Team model with leaders, members, regions
- **Reporting Need**: Generate reports by location/team with team structure

## Recommended Solution: Enhanced Team-Location Mapping

### Option 1: Add Location Mapping to Teams (Recommended)

**Pros:**
- No new models needed
- Leverages existing team structure
- Maintains team hierarchy for reporting
- Clean import process

**Implementation:**
1. Add `locationNames` array field to Team model
2. Map customer locations to teams during import
3. Use existing team structure for reporting

### Option 2: Add teamId to Customer (Alternative)

**Pros:**
- Direct relationship
- Simple queries
- Clear data model

**Implementation:**
1. Add `teamId` field to Customer model
2. Map location to team during import
3. Direct team-customer relationship

## Recommended Implementation Plan

### Phase 1: Enhance Team Model
```prisma
model Team {
  id           String    @id @default(cuid())
  name         String    @unique
  locationNames String[] @map("location_names") // Add this
  leaderUserId String?   @map("leader_user_id")
  regionId     String    @map("region_id")
  // ... existing fields
  customers    Customer[] // Add this relation
}

model Customer {
  // ... existing fields
  teamId       String?   @map("team_id") // Add this
  team         Team?     @relation(fields: [teamId], references: [id])
}
```

### Phase 2: Enhanced Import Logic
- Create location-to-team mapping service
- Update customer import to assign teams based on location
- Maintain backward compatibility with location field

### Phase 3: Reporting Enhancement
- Use team structure for location-based reports
- Team leaders can generate reports for their locations
- Regional rollup using existing region hierarchy

## Benefits of This Approach

1. **Clean Data Model**: Leverages existing team infrastructure
2. **Reporting Ready**: Team structure already supports hierarchical reporting
3. **Scalable**: Can handle multiple locations per team
4. **Migration Friendly**: Preserves existing location data
5. **Business Logic**: Teams can manage customers by location

## Next Steps

Would you like me to:
1. Implement the enhanced team-location mapping?
2. Create the migration scripts?
3. Update the import logic to handle team assignment?
4. Set up the reporting structure?
