import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Account, CreateAccountRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';

export function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api<Account[]>('/accounts'),
  });
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
            <p className="mt-2 text-sm text-gray-600">
              {(accounts || []).length} account{(accounts || []).length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + New Account
          </Button>
        </div>
      </div>
      
      {/* Account List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : (accounts || []).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(accounts || []).map((account) => (
            <div
              key={account.id}
              onClick={() => navigate(`/accounts/${account.id}`)}
              className="cursor-pointer"
            >
              <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {account.type} {account.isLiability ? '(Liability)' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {account.id}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No accounts yet</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create Your First Account
            </Button>
          </div>
        </Card>
      )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
          }}
        />
      )}
    </div>
  );
}

// Create Account Modal
interface CreateAccountModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAccountModal({ onClose, onSuccess }: CreateAccountModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    isLiability: false,
  });
  
  const createMutation = useMutation({
    mutationFn: (data: CreateAccountRequest) =>
      api<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      showToast('Account created successfully', 'success');
      onSuccess();
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: formData.name.trim(),
      type: formData.type,
      isLiability: formData.isLiability,
    });
  };
  
  return (
    <Modal isOpen onClose={onClose} title="New Account" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="Account Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Main Checking, Savings"
        />
        <Input
          type="text"
          label="Account Type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          required
          placeholder="e.g., checking, savings, credit"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isLiability"
            checked={formData.isLiability}
            onChange={(e) => setFormData({ ...formData, isLiability: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isLiability" className="text-sm font-medium text-gray-700">
            This is a liability account (e.g., credit card, loan)
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
