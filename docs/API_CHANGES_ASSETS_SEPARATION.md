# API Changes - Separate Assets from Accounts

## Overview

This update separates `Assets` from `Accounts` to fix the bug where creating assets (like Gold) was creating account records. Assets now have their own table with fields needed for ROI calculations.

## Breaking Changes

### 1. Assets are now separate from Accounts

**Before**: Assets were stored in the `Accounts` table with `Type = "asset"`

**After**: Assets have their own `Assets` table

**Migration Impact**:
- Existing asset records in `Accounts` table are not automatically migrated
- `AssetClass` and `Ticker` fields removed from `Accounts` table
- New `Assets` table created with comprehensive fields

### 2. Account Model Changes

**Added Fields**:
- `Institution` (string, nullable) - Bank name, brokerage, etc.
- `Currency` (string, default "USD") - Account currency
- `UpdatedAt` (DateTime) - Last update timestamp

**Removed Fields**:
- `AssetClass` - Moved to Asset model
- `Ticker` - Moved to Asset model

### 3. Asset Model (New)

**Complete Asset Schema**:
- `Id` (Guid) - Primary key
- `Name` (string, required) - Asset name (e.g., "Gold", "AAPL Stock")
- `AssetClass` (string, required) - stock, crypto, metal, cashequivalent, realestate
- `Ticker` (string, nullable) - Stock/crypto symbol
- `Quantity` (decimal) - Amount held
- `Unit` (string, nullable) - oz, g, kg, shares, btc, etc.
- `CostBasisTotal` (decimal) - Total cost basis for ROI calculation
- `PurchaseDate` (DateTime, nullable) - When acquired
- `Notes` (string, nullable) - Additional info
- `CreatedAt` (DateTime) - Creation timestamp
- `UpdatedAt` (DateTime) - Last update timestamp

## New Endpoints

### Accounts

#### `GET /accounts/{id}`
Get account details including latest balance and snapshot count.

**Response**:
```json
{
  "id": "guid",
  "name": "Checking Account",
  "institution": "Chase",
  "type": "bank",
  "currency": "USD",
  "isLiability": false,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "latestBalance": 5000.50,
  "latestBalanceDate": "2025-01-15",
  "snapshotCount": 15
}
```

#### `PATCH /accounts/{id}`
Update account details (name, institution, type, currency).

**Request**:
```json
{
  "name": "Updated Name",
  "institution": "New Bank",
  "type": "savings",
  "currency": "EUR"
}
```

#### `DELETE /accounts/{id}`
Delete account and cascade delete all associated snapshots.

**Response**: 204 No Content

### Assets

#### `GET /assets/{id}`
Get asset details.

**Response**:
```json
{
  "id": "guid",
  "name": "Gold Bars",
  "assetClass": "metal",
  "ticker": null,
  "quantity": 10.5,
  "unit": "oz",
  "costBasisTotal": 21000.00,
  "purchaseDate": "2024-06-15T00:00:00Z",
  "notes": "Physical gold investment",
  "createdAt": "2024-06-15T12:00:00Z",
  "updatedAt": "2024-06-15T12:00:00Z"
}
```

#### `POST /assets`
Create a new asset (NO LONGER creates an Account).

**Request**:
```json
{
  "name": "Gold",
  "assetClass": "metal",
  "ticker": null,
  "quantity": 10,
  "unit": "oz",
  "costBasisTotal": 20000,
  "purchaseDate": "2024-01-15",
  "notes": "Investment grade gold"
}
```

**Validation Rules**:
- `quantity` must be > 0
- `costBasisTotal` must be >= 0
- `ticker` required if `assetClass` is "stock"
- `unit` required if `assetClass` is "metal"

#### `PATCH /assets/{id}`
Update asset details.

**Request**: Same as POST

#### `DELETE /assets/{id}`
Delete asset.

**Response**: 204 No Content

## Validation Rules

### Assets

| Field | Validation |
|-------|------------|
| `name` | Required, max 100 chars, cannot be whitespace |
| `assetClass` | Required, max 30 chars |
| `ticker` | Max 20 chars, required for stocks, normalized to UPPERCASE |
| `quantity` | Required, must be > 0 |
| `unit` | Max 20 chars, required for metals, normalized to lowercase |
| `costBasisTotal` | Required, must be >= 0 |
| `purchaseDate` | Optional |
| `notes` | Max 500 chars |

### Asset Class Specific Rules

- **Stock** (`assetClass: "stock"`): `ticker` is required
- **Metal** (`assetClass: "metal"`): `unit` is required (e.g., "oz", "g", "kg")
- **Crypto** (`assetClass: "crypto"`): No special requirements

## Migration

### Database Migration

```bash
cd apps/api/FinanceTracker
dotnet ef database update
```

This applies migration `20251231072031_SeparateAssetsAndExpandSchema` which:
1. Removes `AssetClass` and `Ticker` from `Accounts` table
2. Adds `Institution`, `Currency`, and `UpdatedAt` to `Accounts` table
3. Creates new `Assets` table with all asset fields
4. Adds indexes on `Assets.AssetClass` and `Assets.CreatedAt`

### Data Migration (If Needed)

If you have existing asset records in the `Accounts` table:

```sql
-- Example: Move existing assets to new Assets table
INSERT INTO "Assets" (
    "Id", "Name", "AssetClass", "Ticker", 
    "Quantity", "Unit", "CostBasisTotal",
    "CreatedAt", "UpdatedAt"
)
SELECT 
    "Id", 
    "Name", 
    COALESCE("AssetClass", 'other'),
    "Ticker",
    1.0, -- Default quantity
    'units', -- Default unit
    0.00, -- Default cost basis
    "CreatedAt",
    NOW()
FROM "Accounts"
WHERE "Type" = 'asset';

-- Then delete old asset records from Accounts
DELETE FROM "Accounts" WHERE "Type" = 'asset';
```

## Testing

### New Tests Added

**AccountsControllerTests**:
- `GetAccountById_WithValidId_ReturnsAccountDetail`
- `GetAccountById_WithNoSnapshots_ReturnsNullBalance`
- `GetAccountById_WithInvalidId_ReturnsNotFound`
- `UpdateAccount_WithValidData_ReturnsOk`
- `UpdateAccount_WithInvalidId_ReturnsNotFound`
- `DeleteAccount_WithValidId_ReturnsNoContent`
- `DeleteAccount_WithSnapshots_CascadesDelete`
- `DeleteAccount_WithInvalidId_ReturnsNotFound`

**AssetsControllerTests**:
- `CreateAsset_WithGold_DoesNotCreateAccount` - **KEY TEST**: Verifies bug fix
- `CreateAsset_WithStock_RequiresTicker`
- `CreateAsset_WithMetal_RequiresUnit`
- `CreateAsset_WithValidStock_ReturnsCreated`
- `CreateAsset_WithCrypto_ReturnsCreated`
- `GetAssetById_WithValidId_ReturnsAsset`
- `GetAssetById_WithInvalidId_ReturnsNotFound`
- `UpdateAsset_WithValidData_ReturnsOk`
- `DeleteAsset_WithValidId_ReturnsNoContent`
- `CreateAsset_WithZeroQuantity_ReturnsBadRequest`
- `CreateAsset_WithNegativeCostBasis_ReturnsBadRequest`

### Run Tests

```bash
cd C:\FinanceTracker
dotnet test
```

**Expected**: All 98 tests pass

## Example Usage

### Creating a Metal Asset (Gold)

```bash
curl -X POST https://ugwm6qnmpp.us-east-2.awsapprunner.com/assets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gold Bars",
    "assetClass": "metal",
    "quantity": 10,
    "unit": "oz",
    "costBasisTotal": 20000,
    "purchaseDate": "2024-01-15",
    "notes": "Investment grade gold"
  }'
```

### Creating a Stock Asset

```bash
curl -X POST https://ugwm6qnmpp.us-east-2.awsapprunner.com/assets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Apple Stock",
    "assetClass": "stock",
    "ticker": "AAPL",
    "quantity": 100,
    "unit": "shares",
    "costBasisTotal": 15000,
    "purchaseDate": "2023-06-01"
  }'
```

### Getting Account Details

```bash
curl https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts/{account-id}
```

### Updating an Account

```bash
curl -X PATCH https://ugwm6qnmpp.us-east-2.awsapprunner.com/accounts/{account-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Account Name",
    "institution": "New Bank",
    "type": "savings",
    "currency": "EUR"
  }'
```

## Frontend Impact

### TypeScript Types to Update

```typescript
// apps/web/src/types/api.ts

export interface Asset {
  id: string;
  name: string;
  assetClass: string;
  ticker?: string;
  quantity: number;
  unit?: string;
  costBasisTotal: number;
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  institution?: string;
  type?: string;
  currency: string;
  isLiability: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDetail extends Account {
  latestBalance?: number;
  latestBalanceDate?: string;
  snapshotCount: number;
}
```

### API Calls to Update

```typescript
// Get account details
const account = await api<AccountDetail>(`/accounts/${accountId}`);

// Update account
await api(`/accounts/${accountId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    name: 'Updated Name',
    institution: 'New Bank',
    type: 'savings',
    currency: 'USD'
  })
});

// Delete account
await api(`/accounts/${accountId}`, { method: 'DELETE' });

// Create asset
const asset = await api<Asset>('/assets', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Gold',
    assetClass: 'metal',
    quantity: 10,
    unit: 'oz',
    costBasisTotal: 20000
  })
});
```

## Rollback

If you need to rollback this migration:

```bash
cd apps/api/FinanceTracker
dotnet ef database update AddIndexesAndConstraints
```

This will revert to the previous migration before the asset separation.

**Note**: This will drop the `Assets` table and any data in it will be lost.

## Summary

### Fixed
? Assets no longer create Account records
? Gold (and other assets) stored in separate `Assets` table

### Added
? Account detail endpoint (GET /accounts/{id})
? Account update endpoint (PATCH /accounts/{id})
? Account delete endpoint with cascade (DELETE /accounts/{id})
? Asset detail endpoint (GET /assets/{id})
? Asset update endpoint (PATCH /assets/{id})
? Asset delete endpoint (DELETE /assets/{id})
? Comprehensive asset fields for ROI calculations
? Institution and Currency fields on accounts
? Validation rules for asset-specific requirements
? 16 new integration tests

### Schema Changes
- Removed `AssetClass` and `Ticker` from `Accounts`
- Added `Institution`, `Currency`, `UpdatedAt` to `Accounts`
- Created `Assets` table with 11 fields
- Added indexes on `Assets` for performance

## Questions?

See the test files for complete usage examples:
- `apps/api/FinanceTracker.Tests/AccountsControllerTests.cs`
- `apps/api/FinanceTracker.Tests/AssetsControllerTests.cs`
