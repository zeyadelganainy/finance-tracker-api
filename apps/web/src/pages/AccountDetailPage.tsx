import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, parse } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
import { useChartTheme, CHART_DEFAULTS, formatCompactCurrency } from '../lib/chartTheme';
import { ImportTransactionsModal } from '../components/transactions/ImportTransactionsModal';

export function AccountDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const theme = useChartTheme();

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
          <div className="py-12 text-center">
            <p className="text-lg text-danger">{t('accountDetail.notFound')}</p>
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
        
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink">{account.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
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
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="text-danger hover:bg-app-elevated">
              {t('common.delete')}
            </Button>
          </div>
        </div>

        {account.institution && (
          <p className="mt-3 text-sm text-ink-muted">
            <span className="font-medium text-ink">{t('accountDetail.institution')}:</span> {account.institution}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-faint">
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
        <Card className="mb-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="eyebrow">{t('accountDetail.latestBalance')}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink tnum">{formatCurrency(account.latestBalance)}</p>
            </div>
            {account.latestBalanceDate && (
              <div>
                <p className="eyebrow">{t('accountDetail.asOf')}</p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {format(parseISO(account.latestBalanceDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div>
              <p className="eyebrow">{t('accountDetail.snapshots')}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-ink tnum">{account.snapshotCount}</p>
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
            <p className="pt-2 text-sm text-ink-muted">
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
          (() => {
            const validSnapshots = (snapshots || []).filter((s: AccountSnapshot) => s.date);
            const ascending = [...validSnapshots].sort((a, b) => {
              const da = parse(a.date, 'yyyy-MM-dd', new Date()).getTime();
              const db = parse(b.date, 'yyyy-MM-dd', new Date()).getTime();
              return da - db;
            });
            const descending = [...ascending].reverse();
            const chartData = ascending.map((s) => ({
              date: format(parse(s.date, 'yyyy-MM-dd', new Date()), 'MMM dd'),
              balance: s.balance,
            }));
            return (
              <div className="space-y-6">
                {chartData.length > 1 && (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={theme.accent} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={theme.grid} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: theme.axis, ...CHART_DEFAULTS.axisTick }}
                          minTickGap={28}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={56}
                          tick={{ fill: theme.axis, ...CHART_DEFAULTS.axisTick }}
                          tickFormatter={(v) => formatCompactCurrency(Number(v))}
                        />
                        <Tooltip
                          cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
                          contentStyle={{
                            background: theme.tooltip.bg,
                            border: `1px solid ${theme.tooltip.border}`,
                            borderRadius: 8,
                            color: theme.tooltip.text,
                          }}
                          labelStyle={{ color: theme.axis }}
                          formatter={((value: number) => [formatCurrency(Number(value)), t('accountDetail.balance')]) as never}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke={theme.accent}
                          strokeWidth={1.5}
                          fill="url(#balFill)"
                          dot={false}
                          activeDot={{ r: 3, fill: theme.accent, stroke: theme.tooltip.bg, strokeWidth: 2 }}
                          isAnimationActive={CHART_DEFAULTS.animate}
                          animationDuration={CHART_DEFAULTS.animationDuration}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="px-6 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                          {t('accountDetail.date')}
                        </th>
                        <th className="px-6 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                          {t('accountDetail.balance')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {descending.map((snapshot: AccountSnapshot) => (
                        <tr key={snapshot.date} className="transition-colors hover:bg-app-elevated">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-ink">
                            {snapshot.date && !isNaN(parse(snapshot.date, 'yyyy-MM-dd', new Date()).getTime())
                              ? format(parse(snapshot.date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')
                              : t('accountDetail.invalidDate')}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <span className="font-mono text-sm font-semibold text-ink tnum">
                              {formatCurrency(snapshot.balance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="py-8 text-center text-ink-muted">
            {t('accountDetail.noSnapshots')}
          </div>
        )}
      </Card>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal isOpen onClose={() => setShowDeleteConfirm(false)} title={t('accountDetail.deleteTitle')} size="sm">
          <div className="space-y-4">
            <p className="text-ink" dangerouslySetInnerHTML={{ __html: t('accountDetail.deleteBody', { name: account.name }) }} />
            <p className="text-sm text-ink-muted">
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
                variant="danger"
                onClick={handleDelete}
                isLoading={deleteAccountMutation.isPending}
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
    <Card className="mb-8">
      <h3 className="mb-4 font-display text-lg text-ink">{t('accountDetail.editAccount')}</h3>
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
        
        <div className="flex items-center gap-3 rounded-md border border-line bg-app-elevated p-3">
          <input
            type="checkbox"
            id="isLiability"
            checked={formData.isLiability}
            onChange={(e) => setFormData({ ...formData, isLiability: e.target.checked })}
            className="h-4 w-4 rounded border-line-strong accent-[var(--accent-color)]"
          />
          <label htmlFor="isLiability" className="text-sm font-medium text-ink">
            {t('accountDetail.liabilityLabel')}
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-4">
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
