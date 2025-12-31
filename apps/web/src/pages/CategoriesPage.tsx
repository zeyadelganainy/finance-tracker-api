import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Category, CreateCategoryRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="mt-2 text-sm text-gray-600">
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + New Category
          </Button>
        </div>
      </div>
      
      {/* Category List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {category.id}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No categories yet</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create Your First Category
            </Button>
          </div>
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Groceries, Rent, Salary"
          helperText="Category names must be unique"
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
