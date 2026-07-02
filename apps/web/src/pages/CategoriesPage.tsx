import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useCategories } from '../hooks/useCategories';
import { Category } from '../types/api';
import { CategoryForm } from '../components/categories/CategoryForm';

export function CategoriesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { categories, isLoading, error, createCategory, updateCategory, deleteCategory } = useCategories();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl text-ink">{t('categories.title')}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {categories.length === 1
                  ? t('categories.count', { count: categories.length })
                  : t('categories.countPlural', { count: categories.length })}
              </p>
            </div>
            <Button onClick={() => {
              // Ensure only one modal is active to avoid double-mounted modals in StrictMode/dev
              setShowCreateModal(true);
              setEditingCategory(null);
              setPendingDelete(null);
            }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('categories.new')}
            </Button>
          </div>
          {error && (
            <div className="mt-4 rounded-md border border-line bg-app-elevated p-3 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
        
        {/* Category List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-6 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('categories.name')}</th>
                    <th className="px-6 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('categories.type')}</th>
                    <th className="px-6 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('categories.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {categories.map((category) => (
                    <tr key={category.id} className="transition-colors hover:bg-app-elevated">
                      <td className="px-6 py-4 text-sm font-medium text-ink">{category.name}</td>
                      <td className="px-6 py-4 text-sm capitalize text-ink-muted">{category.type || '—'}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setShowCreateModal(false);
                            setPendingDelete(null);
                            setEditingCategory(category);
                          }}>
                            {t('categories.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:text-danger"
                            onClick={() => {
                              setShowCreateModal(false);
                              setEditingCategory(null);
                              setPendingDelete(category);
                            }}
                          >
                            {t('categories.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              title={t('categories.noneTitle')}
              description={t('categories.noneDescription')}
              action={{
                label: t('categories.createAction'),
                onClick: () => setShowCreateModal(true),
              }}
            />
          </Card>
        )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <Modal isOpen onClose={() => setShowCreateModal(false)} title={t('categories.createModalTitle')} size="sm">
          <CategoryForm
            submitting={savingCreate}
            onSubmit={async (values) => {
              try {
                setSavingCreate(true);
                await createCategory({ name: values.name, type: values.type || undefined });
                showToast(t('categories.createSuccess'), 'success');
                setShowCreateModal(false);
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to create category';
                showToast(message, 'error');
              } finally {
                setSavingCreate(false);
              }
            }}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingCategory && (
        <Modal isOpen onClose={() => setEditingCategory(null)} title={t('categories.editModalTitle')} size="sm">
          <CategoryForm
            initialValues={editingCategory}
            submitting={savingEdit}
            onSubmit={async (values) => {
              try {
                setSavingEdit(true);
                await updateCategory({ id: editingCategory.id, name: values.name, type: values.type || undefined });
                showToast(t('categories.updateSuccess'), 'success');
                setEditingCategory(null);
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to update category';
                showToast(message, 'error');
              } finally {
                setSavingEdit(false);
              }
            }}
            onCancel={() => setEditingCategory(null)}
            submitLabel="Save"
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {pendingDelete && (
        <ConfirmModal
          isOpen={!!pendingDelete}
          onClose={() => {
            if (deleting) return; // Avoid closing/reopening while a delete is already running
            setPendingDelete(null);
          }}
          onConfirm={async () => {
            if (deleting || !pendingDelete) return; // Prevent double submission showing duplicate modals
            try {
              setDeleting(true);
              await deleteCategory(pendingDelete.id);
              showToast(t('categories.deleteSuccess'), 'success');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete category';
              showToast(message, 'error');
            } finally {
              setDeleting(false);
              setPendingDelete(null);
            }
          }}
          title={t('categories.confirmDeleteTitle')}
          message={t('categories.confirmDeleteMessage', { name: pendingDelete.name })}
          confirmText={t('common.delete')}
          variant="danger"
          isProcessing={deleting}
        />
      )}
      </div>
    </div>
  );
}
