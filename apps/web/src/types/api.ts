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
  type: string;
  isLiability: boolean;
}

export interface CreateAccountRequest {
  name: string;
  type: string;
  isLiability: boolean;
}

// Assets
export interface Asset {
  id: string; // GUID
  name: string;
  assetClass: string | null;
  ticker: string | null;
}

export interface CreateAssetRequest {
  name: string;
  assetClass?: string;
  ticker?: string;
}

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

// Error
export interface ErrorResponse {
  error: string;
  traceId: string;
}


