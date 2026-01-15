import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, parse } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiClient';
import { AccountDetail, AccountSnapshot, UpsertSnapshotRequest, UpdateAccountRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatCurrency } from '../lib/utils';
import { ImportTransactionsModal } from '../components/transactions/ImportTransactionsModal';

export function AccountDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // State
  const [snapshotDate, setSnapshotDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [balance, setBalance] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Fetch account details
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['account', id],
    queryFn: () => apiFetch<AccountDetail>(`/accounts/${id}`),
    enabled: !!id,
  });
  
  // Fetch account snapshots
  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ['account-snapshots', id],
    queryFn: async () => {
      if (!id) {
        console.error('Account ID is undefined');
        return [];
      }
      console.log('Fetching snapshots for account:', id);
      return apiFetch<AccountSnapshot[]>(`/accounts/${id}/snapshots`);
    },
    enabled: !!id && !!account,
  });
  
  // Upsert snapshot mutation
  const upsertSnapshotMutation = useMutation({
    mutationFn: ({ date, data }: { date: string; data: UpsertSnapshotRequest }) =>
      apiFetch<AccountSnapshot>(`/accounts/${id}/snapshots/${date}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-snapshots', id] });
      queryClient.invalidateQueries({ queryKey: ['account', id] });
      showToast(t('accountDetail.saveSnapshot'), 'success');
      setBalance('');
      setSnapshotDate(format(new Date(), 'yyyy-MM-dd'));
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      showToast(t('common.delete'), 'success');
      navigate('/accounts');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!balance) {
      showToast(t('common.required'), 'error');
      return;
    }
    upsertSnapshotMutation.mutate({
      date: snapshotDate,
      data: { balance: parseFloat(balance) },
    });
  };
  
  const handleDelete = () => {
    deleteAccountMutation.mutate();
  };
  
  if (loadingAccount) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <Card>
          <Skeleton className="h-32" />
        </Card>
      </div>
    );
  }
  
  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate('/accounts')} className="mb-4">
          ← {t('accountDetail.back')}
        </Button>
        <Card>
          <div className="text-center py-12">
            <p className="text-lg text-red-600">{t('accountDetail.notFound')}</p>
            <Button className="mt-4" onClick={() => navigate('/accounts')}>
              {t('accountDetail.back')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/accounts')} className="mb-4">
          ← {t('accountDetail.back')}
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{account.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {account.type && <Badge variant="info">{account.type}</Badge>}
              {account.isLiability && <Badge variant="warning">{t('accountDetail.liability')}</Badge>}
              <Badge variant="default">{account.currency}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowImportModal(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {t('accountDetail.import')}
            </Button>
            <Button variant="outline" onClick={() => setIsEditMode(!isEditMode)}>
              {isEditMode ? t('common.cancel') : t('common.edit')}
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="border-red-200 text-red-600 hover:bg-red-50">
              {t('common.delete')}
            </Button>
          </div>
        </div>
        
        {account.institution && (
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-medium">{t('accountDetail.institution')}:</span> {account.institution}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          {t('accountDetail.created')} {format(parseISO(account.createdAt), 'MMM dd, yyyy')} • {t('accountDetail.updated')} {format(parseISO(account.updatedAt), 'MMM dd, yyyy')}
        </p>
      </div>
      
      {/* Edit Mode */}
      {isEditMode && (
        <EditAccountForm
          account={account}
          onSuccess={() => {
            setIsEditMode(false);
            queryClient.invalidateQueries({ queryKey: ['account', id] });
          }}
          onCancel={() => setIsEditMode(false)}
        />
      )}
      
      {/* Latest Balance */}
      {account.latestBalance !== undefined && (
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('accountDetail.latestBalance')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatCurrency(account.latestBalance)}</p>
            </div>
            {account.latestBalanceDate && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('accountDetail.asOf')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {format(parseISO(account.latestBalanceDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('accountDetail.snapshots')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{account.snapshotCount}</p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Add Snapshot Form */}
      <Card className="mb-8" title={t('accountDetail.addSnapshot')}>
        <form onSubmit={handleSnapshotSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label={t('accountDetail.date')}
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
              required
            />
            <Input
              type="number"
              step="0.01"
              label={t('accountDetail.balance')}
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" isLoading={upsertSnapshotMutation.isPending}>
              {t('accountDetail.saveSnapshot')}
            </Button>
            <p className="text-sm text-gray-600 pt-2">
              {t('accountDetail.snapshotHelp')}
            </p>
          </div>
        </form>
      </Card>
      
      {/* Snapshots List */}
      <Card title={t('accountDetail.balanceHistory')}>
        {loadingSnapshots ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (snapshots || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accountDetail.date')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('accountDetail.balance')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {(snapshots || [])
                  .filter((snapshot: AccountSnapshot) => snapshot.date) // Filter out null/undefined dates
                  .sort((a: AccountSnapshot, b: AccountSnapshot) => {
                    // Safely parse dates with fallback to epoch if invalid
                    const dateA = a.date ? parse(a.date, 'yyyy-MM-dd', new Date()) : new Date(0);
                    const dateB = b.date ? parse(b.date, 'yyyy-MM-dd', new Date()) : new Date(0);
                    // Check for invalid dates and return 0 if either is invalid
                    if (isNaN(dateB.getTime()) || isNaN(dateA.getTime())) return 0;
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((snapshot: AccountSnapshot) => (
                    <tr key={snapshot.date} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {snapshot.date && !isNaN(parse(snapshot.date, 'yyyy-MM-dd', new Date()).getTime())
                          ? format(parse(snapshot.date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')
                          : t('accountDetail.invalidDate')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="font-semibold text-gray-900 dark:text-gray-50">
                          {formatCurrency(snapshot.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t('accountDetail.noSnapshots')}
          </div>
        )}
      </Card>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal isOpen onClose={() => setShowDeleteConfirm(false)} title={t('accountDetail.deleteTitle')} size="sm">
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: t('accountDetail.deleteBody', { name: account.name }) }} />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('accountDetail.deleteSnapshots')}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteAccountMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleDelete}
                isLoading={deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t('accountDetail.deleteTitle')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import Transactions Modal */}
      <ImportTransactionsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        accountId={id!}
        onImportSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['account-snapshots', id] });
          queryClient.invalidateQueries({ queryKey: ['account', id] });
          setShowImportModal(false);
        }}
      />
    </div>
  );
}

// Edit Account Form
interface EditAccountFormProps {
  account: AccountDetail;
  onSuccess: () => void;
  onCancel: () => void;
}

function EditAccountForm({ account, onSuccess, onCancel }: EditAccountFormProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UpdateAccountRequest>({
    name: account.name,
    institution: account.institution || '',
    type: account.type || '',
    currency: account.currency || 'USD',
    isLiability: account.isLiability,
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: UpdateAccountRequest) =>
      apiFetch(`/accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', account.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast(t('accountDetail.saveChanges'), 'success');
      onSuccess();
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast(t('common.required'), 'error');
      return;
    }
    updateMutation.mutate(formData);
  };
  
  return (
    <Card className="mb-8 border-blue-200 bg-blue-50 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">{t('accountDetail.editAccount')}</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            label={t('accountDetail.accountName')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Chase Checking"
          />
          <Input
            type="text"
            label={t('accountDetail.institution')}
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            placeholder="e.g., Chase Bank"
          />
          <Input
            type="text"
            label={t('accountDetail.type')}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="e.g., bank, credit, investment"
          />
          <Input
            type="text"
            label={t('accountDetail.currency')}
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
            placeholder="USD"
          />
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <input
            type="checkbox"
            id="isLiability"
            checked={formData.isLiability}
            onChange={(e) => setFormData({ ...formData, isLiability: e.target.checked })}
            className="w-4 h-4 text-[var(--accent-color,#4f46e5)] bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded focus:ring-[var(--accent-color,#4f46e5)] focus:ring-2"
          />
          <label htmlFor="isLiability" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {t('accountDetail.liabilityLabel')}
          </label>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onCancel} disabled={updateMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={updateMutation.isPending}>
            {t('accountDetail.saveChanges')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
