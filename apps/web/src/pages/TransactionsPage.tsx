import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parse } from 'date-fns';
import { apiFetch } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { Transaction, PagedResponse, Category, CreateTransactionRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

interface TransactionFilters {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  categoryId?: string;
}

const normalizeDateString = (value: string) => {
  if (!value) return value;
  const tIndex = value.indexOf('T');
  return tIndex === -1 ? value : value.slice(0, tIndex);
};

const parseTxnDate = (dateStr: string) => {
  const normalized = normalizeDateString(dateStr);
  const parsedDate = parse(normalized, 'yyyy-MM-dd', new Date());
  if (isNaN(parsedDate.getTime())) {
    return new Date(0); // Stable fallback to keep sort deterministic
  }
  return parsedDate;
};

const isTransactionsQuery = (query: { queryKey?: readonly unknown[] }) =>
  Array.isArray(query.queryKey) && query.queryKey[0] === 'transactions';

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // Default filters: no date range, so backend returns all transactions
  // from/to are intentionally undefined to avoid server-side date filtering
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    pageSize: 20,
    // from: undefined (no start date filter)
    // to: undefined (no end date filter)
  });
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  // Fetch ALL transactions (no pagination to backend, paginate locally after sorting/filtering)
  // This ensures newest-first sorting works across all pages
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', filters.from, filters.to],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '1000', // Fetch max items per request
      });
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      
      const data = await apiFetch<PagedResponse<Transaction>>(`/transactions?${params}`);
      return data;
    },
  });
  
  // Fetch categories for dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/categories'),
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      // Dev-only: log the actual transaction ID being deleted
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`[DeleteTransaction] id=${id}`);
      }
      return apiFetch(`/transactions/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Transaction deleted successfully', 'success');
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  // Update mutation - delete old transaction and create new one (since API has no PUT endpoint)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateTransactionRequest }) => {
      // Dev-only: log the actual transaction ID being edited
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`[UpdateTransaction] id=${id}, data=`, data);
      }
      // API doesn't have PUT endpoint, so delete old and create new
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      return apiFetch<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: isTransactionsQuery });
      showToast('Transaction updated successfully', 'success');
      setEditingId(null);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  };
  
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };
  
  const handleResetFilters = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      from: undefined,
      to: undefined,
      categoryId: undefined,
    });
  };
  
  // Normalize transactions (handle different API response shapes)
  const allTransactions = (transactionsData?.items ?? []).map((t: any) => {
    // Safeguard category access
    const categoryId = t.category?.id ?? t.categoryId ?? 0;
    const categoryName = t.category?.name ?? t.categoryName ?? 'Uncategorized';
    return {
      ...t,
      category: {
        id: categoryId,
        name: categoryName,
      },
    } as Transaction;
  });

  // Sort newest first (today's transactions at top of page 1)
  // IMPORTANT: Parse date-only strings (YYYY-MM-DD) using date-fns parse() to avoid timezone shifts
  const sortedTransactions = [...allTransactions].sort((a, b) => {
    const dateA = parseTxnDate(a.date).getTime();
    const dateB = parseTxnDate(b.date).getTime();
    if (dateB !== dateA) return dateB - dateA; // descending (newest first)
    return b.id - a.id; // tie-breaker by id (newer ids first)
  });

  // Filter by category if needed
  const filteredTransactions = filters.categoryId
    ? sortedTransactions.filter((t) => t.category.id.toString() === filters.categoryId)
    : sortedTransactions;
  
  // Apply client-side pagination AFTER sorting and filtering
  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
  
  // Total based on filtered array (not API response)
  const totalFiltered = filteredTransactions.length;
  const totalPages = Math.ceil(totalFiltered / filters.pageSize);
    
  const hasFilters = filters.from || filters.to || filters.categoryId;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="mt-2 text-sm text-gray-600">
                {totalFiltered} total transactions
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Transaction
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <Card className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reset Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                type="date"
                label="From Date"
                value={filters.from || ''}
                onChange={(e) => handleFilterChange('from', e.target.value || undefined)}
              />
              <Input
                type="date"
                label="To Date"
                value={filters.to || ''}
                onChange={(e) => handleFilterChange('to', e.target.value || undefined)}
              />
              <Select
                label="Category"
                value={filters.categoryId || ''}
                onChange={(e) => handleFilterChange('categoryId', e.target.value || undefined)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...(categories || []).map((c) => ({ value: c.id.toString(), label: c.name })),
                ]}
              />
              <Select
                label="Page Size"
                value={filters.pageSize}
                onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
                options={[
                  { value: 10, label: '10 per page' },
                  { value: 20, label: '20 per page' },
                  { value: 50, label: '50 per page' },
                ]}
              />
            </div>
          </div>
        </Card>
        
        {/* Table */}
        {loadingTransactions ? (
          <Card>
            <TableSkeleton rows={10} />
          </Card>
        ) : paginatedTransactions && paginatedTransactions.length > 0 ? (
          <>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTransactions.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        categories={categories || []}
                        isEditing={editingId === transaction.id}
                        onEdit={() => setEditingId(transaction.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSave={(data) => updateMutation.mutate({ id: transaction.id, data })}
                        onDelete={() => setDeleteConfirm(transaction.id)}
                        isSaving={updateMutation.isPending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            
            {/* Pagination */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{totalFiltered === 0 ? 0 : startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(startIndex + filters.pageSize, totalFiltered)}</span> of{' '}
                <span className="font-medium">{totalFiltered}</span> results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                  disabled={filters.page === 1}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>
                <span className="text-sm text-gray-700 px-2">
                  Page {filters.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  disabled={filters.page >= totalPages}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Card>
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              title="No transactions found"
              description={hasFilters ? "Try adjusting your filters to see more results" : "Get started by adding your first transaction"}
              action={{
                label: hasFilters ? "Reset Filters" : "Add Transaction",
                onClick: hasFilters ? handleResetFilters : () => setShowCreateModal(true),
              }}
            />
          </Card>
        )}
        
        {/* Create Modal */}
        {showCreateModal && (
          <CreateTransactionModal
            categories={categories || []}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              queryClient.invalidateQueries({ predicate: isTransactionsQuery });
            }}
          />
        )}
        
        {/* Delete Confirmation */}
        <ConfirmModal
          isOpen={deleteConfirm !== null}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />
      </div>
    </div>
  );
}

// Transaction Row Component with Inline Edit
interface TransactionRowProps {
  transaction: Transaction;
  categories: Category[];
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: CreateTransactionRequest) => void;
  onDelete: () => void;
  isSaving: boolean;
}

function TransactionRow({
  transaction,
  categories,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
}: TransactionRowProps) {
  const [editData, setEditData] = useState({
    date: transaction.date,
    description: transaction.description || '',
    categoryId: transaction.category.id.toString(),
    amount: transaction.amount.toString(),
  });
  
  const handleSave = () => {
    onSave({
      date: editData.date,
      description: editData.description || undefined,
      categoryId: parseInt(editData.categoryId),
      amount: parseFloat(editData.amount),
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };
  
  if (isEditing) {
    return (
      <tr className="bg-blue-50 border-l-4 border-blue-500">
        <td className="px-6 py-4">
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            onKeyDown={handleKeyPress}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSaving}
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            onKeyDown={handleKeyPress}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Description"
            disabled={isSaving}
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.categoryId}
            onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
            onKeyDown={handleKeyPress}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            disabled={isSaving}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-6 py-4 text-right">
          <input
            type="number"
            step="0.01"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
            onKeyDown={handleKeyPress}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            disabled={isSaving}
          />
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              isLoading={isSaving}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </td>
      </tr>
    );
  }
  
  const isExpense = transaction.amount < 0;
  const amountColor = isExpense ? 'text-red-600' : 'text-green-600';
  
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
        {format(parseTxnDate(transaction.date), 'MMM dd, yyyy')}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {transaction.description || <span className="text-gray-400 italic">No description</span>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Badge variant="default">
          {transaction.category.name}
        </Badge>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${amountColor}`}>
        {formatCurrency(transaction.amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onEdit}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit transaction"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete transaction"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// Create Transaction Modal
interface CreateTransactionModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTransactionModal({ categories, onClose, onSuccess }: CreateTransactionModalProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'), // Local time, no timezone shift
    categoryId: categories[0]?.id.toString() || '',
    description: '',
  });
  
  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionRequest) =>
      apiFetch<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (created) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`[CreateTransaction] raw date=${created?.date}`);
      }
      showToast('Transaction created successfully', 'success');
      onSuccess();
      queryClient.invalidateQueries({ predicate: isTransactionsQuery });
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      amount: parseFloat(formData.amount),
      date: formData.date,
      categoryId: parseInt(formData.categoryId),
      description: formData.description || undefined,
    });
  };
  
  const isExpense = formData.amount && parseFloat(formData.amount) < 0;
  
  return (
    <Modal isOpen onClose={onClose} title="New Transaction" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          type="number"
          step="0.01"
          label="Amount"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          helperText="Use negative for expenses (e.g., -50.00), positive for income (e.g., 3000.00)"
        />
        
        {formData.amount && (
          <div className={`p-3 rounded-lg ${isExpense ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2">
              {isExpense ? (
                <>
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                  <span className="text-sm font-medium text-red-700">
                    Expense: {formatCurrency(parseFloat(formData.amount))}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">
                    Income: {formatCurrency(parseFloat(formData.amount))}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        <Input
          type="date"
          label="Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
        <Select
          label="Category"
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          options={categories.map((c) => ({ value: c.id.toString(), label: c.name }))}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none"
            placeholder="Optional description"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Create Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
}
