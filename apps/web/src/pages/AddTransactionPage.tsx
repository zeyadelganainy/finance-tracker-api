import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setCategoryWarning(t('addTransaction.categoryMissing'));
      setFormData((prev) => ({ ...prev, categoryId: '' }));
    } else {
      setCategoryWarning(null);
    }
  }, [categories, formData.categoryId]);

  function validateForm(): string | null {
    if (!formData.amount || formData.amount === '0') return t('common.required');
    if (!formData.date) return t('common.required');
    if (!formData.categoryId) return t('common.required');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t('addTransaction.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('addTransaction.subtitle')}</p>
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
              label={t('addTransaction.amount')}
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              required
              disabled={submitting || isLoading}
              helperText={t('addTransaction.helper')}
            />

            <Input
              type="date"
              label={t('addTransaction.date')}
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
              disabled={submitting || isLoading}
            />

            <CategorySelect
              label={t('addTransaction.category')}
              categories={categories}
              value={formData.categoryId}
              onChange={(id) => setFormData((prev) => ({ ...prev, categoryId: id }))}
              onCreateNew={() => setShowCategoryModal(true)}
              required
              disabled={submitting || isLoading}
              warning={categoryWarning}
            />

            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{t('addTransaction.description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={200}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                placeholder={t('addTransaction.descriptionPlaceholder')}
                disabled={submitting || isLoading}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addTransaction.descriptionCount', { count: formData.description.length })}</p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/transactions')}
                disabled={submitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={submitting} disabled={submitting || isLoading}>
                {t('addTransaction.submit')}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {showCategoryModal && (
        <Modal isOpen onClose={() => setShowCategoryModal(false)} title={t('categories.createModalTitle')} size="sm">
          <CategoryForm
            submitLabel={t('categories.createSubmit')}
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
