import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { Account, CreateAccountRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { useSettings } from '../settings/SettingsProvider';
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl text-ink">{t('accountsList.title')}</h1>
              <p className="mt-1 text-sm text-ink-muted">
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
                className="group cursor-pointer"
              >
                <Card className="transition-transform duration-150 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-soft text-accent">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-ink transition-colors group-hover:text-accent">
                          {account.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {account.type && <Badge variant="info">{account.type}</Badge>}
                          {account.isLiability && <Badge variant="warning">{t('accountsList.liability')}</Badge>}
                          <Badge variant="default">{account.currency}</Badge>
                        </div>
                        {account.institution && (
                          <p className="mt-2 text-xs text-ink-muted">{account.institution}</p>
                        )}
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-ink-faint transition-colors group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card>
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
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    type: 'checking',
    currency: settings.currency,
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
          onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() as 'CAD' | 'USD' | 'EUR' | 'GBP' })}
          placeholder="USD"
        />
        <div className="flex items-center gap-2 rounded-md border border-line bg-app-elevated p-3">
          <input
            type="checkbox"
            id="isLiability"
            checked={formData.isLiability}
            onChange={(e) => setFormData({ ...formData, isLiability: e.target.checked })}
            className="h-4 w-4 rounded border-line-strong accent-[var(--accent-color)]"
          />
          <label htmlFor="isLiability" className="text-sm font-medium text-ink">
            {t('accountsList.liabilityLabel')}
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-line pt-4">
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
