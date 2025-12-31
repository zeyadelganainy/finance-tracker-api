import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../lib/api';
import { Transaction, PagedResponse, Category, CreateTransactionRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';

interface TransactionFilters {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  categoryId?: string;
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    pageSize: 20,
  });
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  // Fetch transactions with filters
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        pageSize: filters.pageSize.toString(),
      });
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      
      const data = await api<PagedResponse<Transaction>>(`/transactions?${params}`);
      return data;
    },
  });
  
  // Fetch categories for dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Transaction deleted successfully', 'success');
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  // Update via delete + create (since no PUT endpoint exists per README)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateTransactionRequest }) => {
      // Delete old transaction
      await api(`/transactions/${id}`, { method: 'DELETE' });
      // Create new one with updated data
      return api<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
  
  const filteredByCategory = filters.categoryId
    ? transactionsData?.items.filter((t) => t.category.id.toString() === filters.categoryId)
    : transactionsData?.items;
  
  const totalPages = transactionsData
    ? Math.ceil(transactionsData.total / filters.pageSize)
    : 0;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="mt-2 text-sm text-gray-600">
              {transactionsData?.total || 0} total transactions
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + New Transaction
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
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
              ...categories.map((c) => ({ value: c.id.toString(), label: c.name })),
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
      </Card>
      
      {/* Table */}
      {loadingTransactions ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : filteredByCategory && filteredByCategory.length > 0 ? (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredByCategory.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      categories={categories}
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
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {filters.page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={filters.page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              Add Your First Transaction
            </Button>
          </div>
        </Card>
      )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <CreateTransactionModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
  
  const formatAmount = (amount: number) => {
    const isExpense = amount < 0;
    const formatted = Math.abs(amount).toFixed(2);
    return isExpense ? `-$${formatted}` : `$${formatted}`;
  };
  
  const getAmountColor = (amount: number) => {
    return amount < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold';
  };
  
  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-6 py-4">
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            placeholder="Description"
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.categoryId}
            onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            step="0.01"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4 text-right space-x-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            disabled={isSaving}
            className="text-gray-600 hover:text-gray-700 font-medium"
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {format(parseISO(transaction.date), 'MMM dd, yyyy')}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {transaction.description || <span className="text-gray-400 italic">No description</span>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          {transaction.category.name}
        </span>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getAmountColor(transaction.amount)}`}>
        {formatAmount(transaction.amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-700"
          title="Edit"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-700"
          title="Delete"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
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
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: categories[0]?.id.toString() || '',
    description: '',
  });
  
  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionRequest) =>
      api<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      showToast('Transaction created successfully', 'success');
      onSuccess();
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
  
  return (
    <Modal isOpen onClose={onClose} title="New Transaction" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="number"
          step="0.01"
          label="Amount"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          helperText="Use negative for expenses (e.g., -50.00), positive for income (e.g., 3000.00)"
        />
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional description"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
