import { useState } from 'react';
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
  const { showToast } = useToast();
  const { categories, isLoading, error, createCategory, updateCategory, deleteCategory } = useCategories();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
              <p className="mt-2 text-sm text-gray-600">
                {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Category
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
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
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">{category.type || '—'}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingCategory(category)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setPendingDelete(category)}
                          >
                            Delete
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
              title="No categories yet"
              description="Create categories to organize your transactions"
              action={{
                label: 'Create Category',
                onClick: () => setShowCreateModal(true),
              }}
            />
          </Card>
        )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <Modal isOpen onClose={() => setShowCreateModal(false)} title="New Category" size="sm">
          <CategoryForm
            submitting={savingCreate}
            onSubmit={async (values) => {
              try {
                setSavingCreate(true);
                await createCategory({ name: values.name, type: values.type || undefined });
                showToast('Category created successfully', 'success');
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
        <Modal isOpen onClose={() => setEditingCategory(null)} title="Edit Category" size="sm">
          <CategoryForm
            initialValues={editingCategory}
            submitting={savingEdit}
            onSubmit={async (values) => {
              try {
                setSavingEdit(true);
                await updateCategory({ id: editingCategory.id, name: values.name, type: values.type || undefined });
                showToast('Category updated', 'success');
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
          isOpen={true}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            try {
              await deleteCategory(pendingDelete.id);
              showToast('Category deleted', 'success');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete category';
              showToast(message, 'error');
            } finally {
              setPendingDelete(null);
            }
          }}
          title="Delete Category"
          message={`Are you sure you want to delete "${pendingDelete.name}"? This cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />
      )}
      </div>
    </div>
  );
}
