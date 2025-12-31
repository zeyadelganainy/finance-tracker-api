import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Asset, CreateAssetRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export function AssetsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api<Asset[]>('/assets'),
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
              <p className="mt-2 text-sm text-gray-600">
                {(assets || []).length} asset{(assets || []).length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Asset
            </Button>
          </div>
        </div>
      
        {/* Asset List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (assets || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(assets || []).map((asset) => (
              <Card key={asset.id} className="hover:shadow-lg transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{asset.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {asset.assetClass && (
                        <Badge variant="info">{asset.assetClass}</Badge>
                      )}
                      {asset.ticker && (
                        <Badge variant="default">{asset.ticker}</Badge>
                      )}
                    </div>
                    {!asset.assetClass && !asset.ticker && (
                      <p className="text-sm text-gray-400 mt-2">No additional details</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={(
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              title="No assets yet"
              description="Track your investments by creating asset records"
              action={{
                label: "Create Asset",
                onClick: () => setShowCreateModal(true),
              }}
            />
          </Card>
        )}
      
        {/* Create Modal */}
        {showCreateModal && (
          <CreateAssetModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              queryClient.invalidateQueries({ queryKey: ['assets'] });
            }}
          />
        )}
      </div>
    </div>
  );
}

// Create Asset Modal
interface CreateAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAssetModal({ onClose, onSuccess }: CreateAssetModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    assetClass: '',
    ticker: '',
  });
  
  const createMutation = useMutation({
    mutationFn: (data: CreateAssetRequest) =>
      api<Asset>('/assets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      showToast('Asset created successfully', 'success');
      onSuccess();
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Asset name is required', 'error');
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      assetClass: formData.assetClass.trim() || undefined,
      ticker: formData.ticker.trim().toUpperCase() || undefined,
    });
  };
  
  return (
    <Modal isOpen onClose={onClose} title="New Asset" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          type="text"
          label="Asset Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Apple Stock, Bitcoin, Gold"
          autoFocus
        />
        <Input
          type="text"
          label="Asset Class (Optional)"
          value={formData.assetClass}
          onChange={(e) => setFormData({ ...formData, assetClass: e.target.value })}
          placeholder="e.g., Stock, Crypto, Commodity"
        />
        <Input
          type="text"
          label="Ticker Symbol (Optional)"
          value={formData.ticker}
          onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
          placeholder="e.g., AAPL, BTC, XAU"
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Create Asset
          </Button>
        </div>
      </form>
    </Modal>
  );
}
