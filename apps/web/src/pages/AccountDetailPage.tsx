import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { api } from '../lib/api';
import { Account, AccountSnapshot, UpsertSnapshotRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [snapshotDate, setSnapshotDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [balance, setBalance] = useState('');
  
  // Fetch account details
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['account', id],
    queryFn: () => api<Account>(`/accounts/${id}`),
    enabled: !!id,
  });
  
  // Fetch account snapshots
  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ['account-snapshots', id],
    queryFn: () => api<AccountSnapshot[]>(`/accounts/${id}/snapshots`),
    enabled: !!id,
  });
  
  // Upsert snapshot mutation
  const upsertSnapshotMutation = useMutation({
    mutationFn: ({ date, data }: { date: string; data: UpsertSnapshotRequest }) =>
      api<AccountSnapshot>(`/accounts/${id}/snapshots/${date}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-snapshots', id] });
      showToast('Snapshot saved successfully', 'success');
      setBalance('');
      setSnapshotDate(format(new Date(), 'yyyy-MM-dd'));
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
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
  
  const isLoading = loadingAccount || loadingSnapshots;
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/accounts')} className="mb-4">
          ← Back to Accounts
        </Button>
        {isLoading ? (
          <div className="h-12 bg-gray-200 animate-pulse rounded w-64" />
        ) : account ? (
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {account.type} {account.isLiability ? '• Liability' : '• Asset'}
            </p>
            <p className="text-sm text-gray-500">ID: {account.id}</p>
          </div>
        ) : (
          <div className="text-red-600">Account not found</div>
        )}
      </div>
      
      {!isLoading && account && (
        <>
          {/* Add/Update Snapshot Form */}
          <Card className="mb-8" title="Add or Update Balance Snapshot">
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <Button type="submit" disabled={upsertSnapshotMutation.isPending}>
                  {upsertSnapshotMutation.isPending ? 'Saving...' : 'Save Snapshot'}
                </Button>
              </div>
            </form>
          </Card>
          
          {/* Snapshots List */}
          <Card title="Balance History">
            {loadingSnapshots ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
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
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((snapshot) => (
                        <tr key={snapshot.date} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(parseISO(snapshot.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                            ${snapshot.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No snapshots recorded yet
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
