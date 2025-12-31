import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Asset, CreateAssetRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';

export function AssetsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api<Asset[]>('/assets'),
  });
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
            <p className="mt-2 text-sm text-gray-600">
              {(assets || []).length} asset{(assets || []).length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + New Asset
          </Button>
        </div>
      </div>
      
      {/* Asset List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : (assets || []).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(assets || []).map((asset) => (
            <Card key={asset.id}>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                <div className="space-y-1">
                  {asset.assetClass && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Class:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {asset.assetClass}
                      </span>
                    </div>
                  )}
                  {asset.ticker && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Ticker:</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-medium">
                        {asset.ticker}
                      </span>
                    </div>
                  )}
                  {!asset.assetClass && !asset.ticker && (
                    <p className="text-xs text-gray-400 italic">No additional details</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">ID: {asset.id}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">No assets yet</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create Your First Asset
            </Button>
          </div>
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="Asset Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Apple Stock, Bitcoin, Gold"
        />
        <Input
          type="text"
          label="Asset Class (Optional)"
          value={formData.assetClass}
          onChange={(e) => setFormData({ ...formData, assetClass: e.target.value })}
          placeholder="e.g., Stock, Crypto, Commodity"
          helperText="Category or type of asset"
        />
        <Input
          type="text"
          label="Ticker Symbol (Optional)"
          value={formData.ticker}
          onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
          placeholder="e.g., AAPL, BTC, XAU"
          helperText="Stock ticker or symbol"
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Asset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
