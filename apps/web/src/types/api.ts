/**
 * TypeScript types for Finance Tracker API
 * Based on: https://github.com/zeyadelganainy/finance-tracker-api
 */

export interface Transaction {
  id: number;
  amount: number;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  description?: string;
  category?: {
    id: number;
    name: string;
  };
}

export interface Category {
  id: number;
  name: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ErrorResponse {
  error: string;
  traceId: string;
}

export interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  expenseBreakdown: ExpenseBreakdown[];
}

export interface ExpenseBreakdown {
  categoryId: number;
  categoryName: string;
  total: number;
}

