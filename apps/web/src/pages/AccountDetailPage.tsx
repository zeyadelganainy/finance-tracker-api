import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, parse } from 'date-fns';
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

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // State
  const [snapshotDate, setSnapshotDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [balance, setBalance] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Fetch account details
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['account', id],
    queryFn: () => apiFetch<AccountDetail>(`/accounts/${id}`),
    enabled: !!id,
  });
  
  // Fetch account snapshots
  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ['account-snapshots', id],
    queryFn: () => apiFetch<AccountSnapshot[]>(`/accounts/${id}/snapshots`),
    enabled: !!id,
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
      showToast('Snapshot saved successfully', 'success');
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
      showToast('Account deleted successfully', 'success');
      navigate('/accounts');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!balance) {
      showToast('Balance is required', 'error');
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
          ← Back to Accounts
        </Button>
        <Card>
          <div className="text-center py-12">
            <p className="text-lg text-red-600">Account not found</p>
            <Button className="mt-4" onClick={() => navigate('/accounts')}>
              Back to Accounts
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
          ← Back to Accounts
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {account.type && <Badge variant="info">{account.type}</Badge>}
              {account.isLiability && <Badge variant="warning">Liability</Badge>}
              <Badge variant="default">{account.currency}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditMode(!isEditMode)}>
              {isEditMode ? 'Cancel' : 'Edit'}
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="border-red-200 text-red-600 hover:bg-red-50">
              Delete
            </Button>
          </div>
        </div>
        
        {account.institution && (
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-medium">Institution:</span> {account.institution}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Created {format(parseISO(account.createdAt), 'MMM dd, yyyy')} • Updated {format(parseISO(account.updatedAt), 'MMM dd, yyyy')}
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
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Latest Balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(account.latestBalance)}</p>
            </div>
            {account.latestBalanceDate && (
              <div>
                <p className="text-sm text-gray-600">As of</p>
                <p className="text-lg font-semibold text-gray-900">
                  {format(parseISO(account.latestBalanceDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Snapshots</p>
              <p className="text-lg font-semibold text-gray-900">{account.snapshotCount}</p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Add Snapshot Form */}
      <Card className="mb-8" title="Add or Update Balance Snapshot">
        <form onSubmit={handleSnapshotSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Date"
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
              required
            />
            <Input
              type="number"
              step="0.01"
              label="Balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" isLoading={upsertSnapshotMutation.isPending}>
              Save Snapshot
            </Button>
            <p className="text-sm text-gray-600 pt-2">
              Creates or updates the balance for this date
            </p>
          </div>
        </form>
      </Card>
      
      {/* Snapshots List */}
      <Card title="Balance History">
        {loadingSnapshots ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (snapshots || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(snapshots || [])
                  .sort((a, b) => parse(b.date, 'yyyy-MM-dd', new Date()).getTime() - parse(a.date, 'yyyy-MM-dd', new Date()).getTime())
                  .map((snapshot) => (
                    <tr key={snapshot.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(parse(snapshot.date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(snapshot.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No snapshots recorded yet. Add one above to get started.
          </div>
        )}
      </Card>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal isOpen onClose={() => setShowDeleteConfirm(false)} title="Delete Account" size="sm">
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete <strong>{account.name}</strong>? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600">
              All associated snapshots will be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteAccountMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                isLoading={deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </Modal>
      )}
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
      showToast('Account updated successfully', 'success');
      onSuccess();
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Account name is required', 'error');
      return;
    }
    updateMutation.mutate(formData);
  };
  
  return (
    <Card className="mb-8 border-blue-200 bg-blue-50">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Account</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            label="Account Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Chase Checking"
          />
          <Input
            type="text"
            label="Institution (Optional)"
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            placeholder="e.g., Chase Bank"
          />
          <Input
            type="text"
            label="Type (Optional)"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="e.g., bank, credit, investment"
          />
          <Input
            type="text"
            label="Currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
            placeholder="USD"
          />
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200">
          <input
            type="checkbox"
            id="isLiability"
            checked={formData.isLiability}
            onChange={(e) => setFormData({ ...formData, isLiability: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="isLiability" className="text-sm font-medium text-gray-700">
            This is a liability account (e.g., credit card, loan)
          </label>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onCancel} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={updateMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
