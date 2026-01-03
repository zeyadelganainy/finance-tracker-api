import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { apiFetch } from '../lib/apiClient';
import { useCategories } from '../hooks/useCategories';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { CategorySelect } from '../components/categories/CategorySelect';
import { CategoryForm } from '../components/categories/CategoryForm';

interface FormData {
  amount: string;
  date: string;
  categoryId: string;
  description: string;
}

export function AddTransactionPage() {
  const navigate = useNavigate();
  const { categories, isLoading, error, createCategory } = useCategories();
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryWarning, setCategoryWarning] = useState<string | null>(null);

  useEffect(() => {
    if (formData.categoryId && !categories.find((c) => c.id === formData.categoryId)) {
      setCategoryWarning('Selected category no longer exists. Please choose another.');
      setFormData((prev) => ({ ...prev, categoryId: '' }));
    } else {
      setCategoryWarning(null);
    }
  }, [categories, formData.categoryId]);

  function validateForm(): string | null {
    if (!formData.amount || formData.amount === '0') return 'Amount is required and cannot be zero';
    if (!formData.date) return 'Date is required';
    if (!formData.categoryId) return 'Category is required';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const payload = {
        amount: parseFloat(formData.amount),
        date: formData.date,
        categoryId: parseInt(formData.categoryId),
        description: formData.description.trim() || undefined,
      };
      await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(payload) });
      navigate('/transactions');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  }

  const handleCreateCategory = async (values: { name: string; type?: 'expense' | 'income' }) => {
    const created = await createCategory(values);
    setFormData((prev) => ({ ...prev, categoryId: created.id }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add Transaction</h1>
          <p className="text-sm text-gray-600 mt-2">Record a new income or expense</p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{errorMessage}</div>
            )}
            {error && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <Input
              type="number"
              step="0.01"
              label="Amount"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              required
              disabled={submitting || isLoading}
              helperText="Use negative for expenses (e.g., -50.00) and positive for income (e.g., 3000.00)"
            />

            <Input
              type="date"
              label="Date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
              disabled={submitting || isLoading}
            />

            <CategorySelect
              label="Category"
              categories={categories}
              value={formData.categoryId}
              onChange={(id) => setFormData((prev) => ({ ...prev, categoryId: id }))}
              onCreateNew={() => setShowCategoryModal(true)}
              required
              disabled={submitting || isLoading}
              warning={categoryWarning}
            />

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={200}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                placeholder="Add a description (optional)"
                disabled={submitting || isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">{formData.description.length}/200 characters</p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/transactions')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting} disabled={submitting || isLoading}>
                Create Transaction
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {showCategoryModal && (
        <Modal isOpen onClose={() => setShowCategoryModal(false)} title="Create Category" size="sm">
          <CategoryForm
            submitLabel="Create"
            onSubmit={async (values) => {
              try {
                await handleCreateCategory({ name: values.name, type: values.type || undefined });
                setShowCategoryModal(false);
              } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : 'Failed to create category');
              }
            }}
            onCancel={() => setShowCategoryModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
