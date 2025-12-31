import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Category, CreateCategoryRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
              <p className="mt-2 text-sm text-gray-600">
                {(categories || []).length} categor{(categories || []).length === 1 ? 'y' : 'ies'}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Category
            </Button>
          </div>
        </div>
        
        {/* Category List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (categories || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(categories || []).map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {category.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-xs text-gray-400">ID: {category.id}</p>
                      </div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </Card>
            ))}
          </div>
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
                label: "Create Category",
                onClick: () => setShowCreateModal(true),
              }}
            />
          </Card>
        )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <CreateCategoryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
          }}
        />
      )}
      </div>
    </div>
  );
}

// Create Category Modal
interface CreateCategoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateCategoryModal({ onClose, onSuccess }: CreateCategoryModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  
  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryRequest) =>
      api<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      showToast('Category created successfully', 'success');
      onSuccess();
    },
    onError: (error: Error) => {
      // Check for 409 Conflict (duplicate name)
      if (error.message.includes('409') || error.message.toLowerCase().includes('conflict')) {
        showToast('A category with this name already exists', 'error');
      } else {
        showToast(error.message, 'error');
      }
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    createMutation.mutate({ name: name.trim() });
  };
  
  return (
    <Modal isOpen onClose={onClose} title="New Category" size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          type="text"
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Groceries, Rent, Salary"
          helperText="Category names must be unique"
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Create Category
          </Button>
        </div>
      </form>
    </Modal>
  );
}
