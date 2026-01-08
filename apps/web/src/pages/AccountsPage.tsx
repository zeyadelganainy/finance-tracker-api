import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { Account, CreateAccountRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export function AccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<Account[]>('/accounts'),
  });
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t('accountsList.title')}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t((accounts || []).length === 1 ? 'accountsList.count' : 'accountsList.countPlural', { count: (accounts || []).length })}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('accountsList.new')}
            </Button>
          </div>
        </div>
        
        {/* Account List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (accounts || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(accounts || []).map((account) => (
              <div
                key={account.id}
                onClick={() => navigate(`/accounts/${account.id}`)}
                className="cursor-pointer group"
              >
                <Card className="hover:shadow-lg transition-all hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xl font-bold">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {account.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {account.type && <Badge variant="info">{account.type}</Badge>}
                          {account.isLiability && <Badge variant="warning">{t('accountsList.liability')}</Badge>}
                          <Badge variant="default">{account.currency}</Badge>
                        </div>
                        {account.institution && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{account.institution}</p>
                        )}
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
              title={t('accountsList.noneTitle')}
              description={t('accountsList.noneDescription')}
              action={{
                label: t('accountsList.createAction'),
                onClick: () => setShowCreateModal(true),
              }}
            />
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    type: 'checking',
    currency: 'USD',
    isLiability: false,
  });
  
  const createMutation = useMutation({
    mutationFn: (data: CreateAccountRequest) =>
      apiFetch<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      showToast(t('accountsList.createSuccess'), 'success');
      onSuccess();
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast(t('accountsList.nameRequired'), 'error');
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      institution: formData.institution.trim() || undefined,
      type: formData.type.trim() || undefined,
      currency: formData.currency.toUpperCase() || 'USD',
      isLiability: formData.isLiability,
    });
  };
  
  return (
    <Modal isOpen onClose={onClose} title={t('accountsList.createTitle')} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          type="text"
          label={t('accountsList.accountName')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Chase Checking, Savings"
          autoFocus
        />
        <Input
          type="text"
          label={t('accountsList.institution')}
          value={formData.institution}
          onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
          placeholder="e.g., Chase Bank, Fidelity"
        />
        <Input
          type="text"
          label={t('accountsList.type')}
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          placeholder="e.g., checking, savings, investment"
        />
        <Input
          type="text"
          label={t('accountsList.currency')}
          value={formData.currency}
          onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
          placeholder="USD"
        />
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <input
            type="checkbox"
            id="isLiability"
            checked={formData.isLiability}
            onChange={(e) => setFormData({ ...formData, isLiability: e.target.checked })}
            className="w-4 h-4 accent-[var(--color-accent-600)] bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 rounded focus:ring-[var(--color-accent-500)] focus:ring-2"
          />
          <label htmlFor="isLiability" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('accountsList.liabilityLabel')}
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            {t('accountsList.createAction')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
