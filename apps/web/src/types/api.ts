/**
 * TypeScript types for Finance Tracker API
 * Based on: https://github.com/zeyadelganainy/finance-tracker-api
 */

// Categories
export interface Category {
  id: number;
  name: string;
}

export interface CreateCategoryRequest {
  name: string;
}

// Transactions
export interface Transaction {
  id: number;
  amount: number; // Negative = expense, Positive = income
  date: string; // YYYY-MM-DD
  description: string | null;
  category: {
    id: number;
    name: string;
  };
}

export interface CreateTransactionRequest {
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: number;
  description?: string;
}

// Accounts
export interface Account {
  id: string; // GUID
  name: string;
  institution?: string; // Bank name, brokerage, etc.
  type?: string;
  currency: string; // Default "USD"
  isLiability: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface AccountDetail extends Account {
  latestBalance?: number; // Most recent snapshot balance
  latestBalanceDate?: string; // YYYY-MM-DD
  snapshotCount: number; // Total number of snapshots
}

export interface CreateAccountRequest {
  name: string;
  institution?: string;
  type?: string;
  currency?: string;
  isLiability?: boolean;
}

export interface UpdateAccountRequest {
  name: string;
  institution?: string;
  type?: string;
  currency?: string;
  isLiability?: boolean;
}

// Assets
export interface Asset {
  id: string; // GUID
  name: string;
  assetClass: string; // Stock, Crypto, Metal, etc.
  ticker?: string; // Stock/crypto symbol
  quantity: number; // Amount held (decimal)
  unit?: string; // oz, g, kg, shares, btc, etc.
  costBasisTotal: number; // Total cost basis for ROI
  purchaseDate?: string; // ISO date or null
  notes?: string; // Additional info
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface CreateAssetRequest {
  name: string;
  assetClass: string; // Required
  ticker?: string;
  quantity: number; // Required, > 0
  unit?: string;
  costBasisTotal: number; // Required, >= 0
  purchaseDate?: string; // Optional, ISO date format
  notes?: string;
}

export interface UpdateAssetRequest extends CreateAssetRequest {}

// Account Snapshots
export interface AccountSnapshot {
  date: string; // YYYY-MM-DD
  balance: number;
}

export interface UpsertSnapshotRequest {
  balance: number;
}

// Net Worth
export interface NetWorthDataPoint {
  date: string; // YYYY-MM-DD
  netWorth: number;
}

export interface NetWorthHistoryResponse {
  from: string;
  to: string;
  interval: 'daily' | 'weekly' | 'monthly';
  dataPoints: NetWorthDataPoint[];
}

// Summary
export interface MonthlySummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpenses: number;
  net: number;
  expenseBreakdown: ExpenseBreakdown[];
}

export interface ExpenseBreakdown {
  categoryId: number;
  categoryName: string;
  total: number; // Negative value
}

// Pagination
export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// Health
export interface HealthResponse {
  status: string;
}

// AI Context
export interface AIContextResponse {
  accounts: AIAccountsSummary;
  assets: AIAssetsSummary;
  transactions: AITransactionsSummary;
  categories: AICategoriesSummary;
}

export interface AIAccountsSummary {
  totalAccounts: number;
  totalBalance: number;
  items: AIAccountData[];
}

export interface AIAccountData {
  id: string;
  name: string;
  type?: string;
  isLiability: boolean;
  latestBalance?: number;
  latestBalanceDate?: string;
}

export interface AIAssetsSummary {
  totalAssets: number;
  totalCostBasis: number;
  items: AIAssetData[];
}

export interface AIAssetData {
  id: string;
  name: string;
  assetClass: string;
  ticker?: string;
  quantity: number;
  unit?: string;
  costBasisTotal: number;
  purchaseDate?: string;
}

export interface AITransactionsSummary {
  totalCount: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  earliestDate?: string;
  latestDate?: string;
  categoryBreakdown: AICategoryBreakdown[];
}

export interface AICategoryBreakdown {
  categoryName: string;
  total: number;
  count: number;
}

export interface AICategoriesSummary {
  totalCategories: number;
  categoryNames: string[];
}

// Asset Valuation
export interface AssetValuationResponse {
  assets: AssetValuationData[];
  message: string;
}

export interface AssetValuationData {
  assetId: string;
  name: string;
  assetClass: string;
  ticker?: string;
  quantity: number;
  unit?: string;
  costBasisTotal: number;
  currentPrice?: number | null;
  currentValue?: number | null;
  unrealizedGainLoss?: number | null;
  roiPercentage?: number | null;
  valuationStatus: string; // "NOT_AVAILABLE", "PENDING", "AVAILABLE", etc.
}

// Error
export interface ErrorResponse {
  error: string;
  traceId: string;
}


