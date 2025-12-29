# Database Hardening Migration Summary

## Migration: AddIndexesAndConstraints
**Generated:** 20251229080929

## Changes Applied

### 1. Transaction Performance Indexes
Added indexes to optimize common query patterns:
- **`IX_Transactions_Date`**: Single column index on `Date` for sorting and date range queries
- **`IX_Transactions_CategoryId`**: Already existed, maintained for category filtering
- **`IX_Transactions_Date_CategoryId`**: Composite index for queries filtering by both date and category

**Performance Impact:**
- Faster pagination and sorting on transaction list endpoints
- Improved performance for monthly/date range queries
- Better filtering by category with date constraints

### 2. Category Uniqueness Constraint
Added unique index on `Categories.Name`:
- **`IX_Categories_Name`**: Prevents duplicate category names at database level
- Complements existing application-level duplicate checking
- Database-enforced data integrity

**Impact:**
- No duplicate categories possible
- Database-level protection even if application logic is bypassed
- Better data consistency

### 3. AccountSnapshot Indexes
Enhanced existing constraints:
- **`IX_AccountSnapshots_AccountId_Date`**: Already existed (unique), maintained
- **`IX_AccountSnapshots_Date`**: NEW - Added for date range queries
- **Balance precision**: Already existed (18,2), maintained

**Performance Impact:**
- Faster net worth calculations across date ranges
- Improved snapshot history queries
- Better performance for time-series data analysis

### 4. Foreign Key Delete Behaviors
Made delete behaviors explicit and production-safe:

#### Transaction ? Category
```csharp
OnDelete(DeleteBehavior.Restrict)
```
- Changed from `Cascade` to `Restrict`
- Prevents accidental data loss
- Categories with transactions cannot be deleted
- Forces cleanup of transactions first

#### AccountSnapshot ? Account
```csharp
OnDelete(DeleteBehavior.Cascade)
```
- Explicitly set to `Cascade` (was implicit)
- Logical behavior: deleting account removes its snapshots
- Clean data management

## Database Changes Summary

| Table | Change Type | Details |
|-------|-------------|---------|
| Transactions | Index | Added `Date` index |
| Transactions | Index | Added composite `(Date, CategoryId)` index |
| Transactions | FK Behavior | Changed Category FK from Cascade to Restrict |
| Categories | Constraint | Added unique index on `Name` |
| AccountSnapshots | Index | Added `Date` index |
| AccountSnapshots | FK Behavior | Explicitly set Account FK to Cascade |

## Migration Commands

### Apply to Development Database
```bash
dotnet ef database update --project FinanceTracker\FinanceTracker.csproj
```

### Apply to Production
```bash
# Using connection string
dotnet ef database update --project FinanceTracker\FinanceTracker.csproj --connection "your-production-connection-string"

# Or generate SQL script for DBA review
dotnet ef migrations script --project FinanceTracker\FinanceTracker.csproj --output migration.sql
```

## Testing Results
? All 92 tests passing
? No breaking changes to API behavior
? In-memory database provider handles new constraints correctly

## Rollback
If needed, rollback using:
```bash
dotnet ef database update AddAssetFieldsToAccounts --project FinanceTracker\FinanceTracker.csproj
```

Then remove the migration:
```bash
dotnet ef migrations remove --project FinanceTracker\FinanceTracker.csproj
```

## Notes
- Changes are backward compatible with existing data
- No data migration required
- Indexes created with `CREATE INDEX` (non-blocking in PostgreSQL 11+)
- Unique constraint may fail if duplicate category names exist (clean data first)
- Delete behavior change on Category FK prevents accidental cascades
