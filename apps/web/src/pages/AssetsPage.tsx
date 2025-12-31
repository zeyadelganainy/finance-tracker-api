import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';
import { Asset, CreateAssetRequest } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useAssetValuation } from '../hooks/useAI';

export function AssetsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiFetch<Asset[]>('/assets'),
  });
  
  // Fetch valuations (AI-ready, currently stub)
  const { data: valuationData } = useAssetValuation();
  
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
            {(assets || []).map((asset) => {
              // Find valuation data for this asset
              const valuation = valuationData?.assets.find(v => v.assetId === asset.id);
              
              return (
                <Card key={asset.id} className="hover:shadow-lg transition-all">
                  <div className="flex flex-col gap-4">
                    {/* Asset Header */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="info">{asset.assetClass}</Badge>
                          {asset.ticker && <Badge variant="default">{asset.ticker}</Badge>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Cost Basis Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="font-semibold text-gray-900">
                          {asset.quantity} {asset.unit ? asset.unit : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cost Basis</p>
                        <p className="font-semibold text-gray-900">
                          ${asset.costBasisTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    {(asset.purchaseDate || asset.notes) && (
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                        {asset.purchaseDate && (
                          <p>Purchased {new Date(asset.purchaseDate).toLocaleDateString()}</p>
                        )}
                        {asset.notes && <p className="italic">{asset.notes}</p>}
                      </div>
                    )}
                    
                    {/* Valuation Section (AI-Ready) */}
                    <ValuationSection valuation={valuation} />
                  </div>
                </Card>
              );
            })}
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
              description="Track your investments by creating asset records with quantity, cost basis, and ROI data"
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
    assetClass: 'stock',
    ticker: '',
    quantity: '',
    unit: 'shares',
    costBasisTotal: '',
    purchaseDate: '',
    notes: '',
  });
  
  const createMutation = useMutation({
    mutationFn: (data: CreateAssetRequest) =>
      apiFetch<Asset>('/assets', {
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
    
    // Validation
    if (!formData.name.trim()) {
      showToast('Asset name is required', 'error');
      return;
    }
    
    if (!formData.assetClass.trim()) {
      showToast('Asset class is required', 'error');
      return;
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }
    
    if (!formData.costBasisTotal || parseFloat(formData.costBasisTotal) < 0) {
      showToast('Cost basis must be 0 or greater', 'error');
      return;
    }
    
    const assetClass = formData.assetClass.toLowerCase();
    
    // Stock-specific validation
    if (assetClass === 'stock' && !formData.ticker.trim()) {
      showToast('Ticker is required for stocks', 'error');
      return;
    }
    
    // Metal-specific validation
    if (assetClass === 'metal' && !formData.unit.trim()) {
      showToast('Unit is required for metals (e.g., oz, g, kg)', 'error');
      return;
    }
    
    const submitData: CreateAssetRequest = {
      name: formData.name.trim(),
      assetClass,
      ticker: formData.ticker.trim() || undefined,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit.trim() || undefined,
      costBasisTotal: parseFloat(formData.costBasisTotal),
      purchaseDate: formData.purchaseDate || undefined,
      notes: formData.notes.trim() || undefined,
    };
    
    createMutation.mutate(submitData);
  };
  
  const assetClass = formData.assetClass.toLowerCase();
  
  return (
    <Modal isOpen onClose={onClose} title="New Asset" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            label="Asset Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Apple Stock, Bitcoin, Gold"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Class <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assetClass}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  assetClass: e.target.value,
                  unit: e.target.value === 'stock' ? 'shares' : '',
                  ticker: '',
                });
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="stock">Stock</option>
              <option value="crypto">Crypto</option>
              <option value="metal">Metal</option>
              <option value="cashequivalent">Cash Equivalent</option>
              <option value="realestate">Real Estate</option>
            </select>
          </div>
        </div>
        
        {/* Asset Class Specific Fields */}
        {(assetClass === 'stock' || assetClass === 'crypto') && (
          <Input
            type="text"
            label={`Ticker ${assetClass === 'stock' ? '(Required)' : '(Optional)'}`}
            value={formData.ticker}
            onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
            required={assetClass === 'stock'}
            placeholder={assetClass === 'stock' ? 'e.g., AAPL' : 'e.g., BTC'}
          />
        )}
        
        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            step="0.00000001"
            label="Quantity"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
            placeholder="0.00"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit {assetClass === 'metal' && <span className="text-red-500">*</span>}
            </label>
            {assetClass === 'stock' ? (
              <input
                type="text"
                value={formData.unit}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            ) : (
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required={assetClass === 'metal'}
                placeholder={assetClass === 'metal' ? 'e.g., oz, g, kg' : 'e.g., btc, units'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            )}
          </div>
        </div>
        
        {/* Cost Basis */}
        <Input
          type="number"
          step="0.01"
          label="Total Cost Basis"
          value={formData.costBasisTotal}
          onChange={(e) => setFormData({ ...formData, costBasisTotal: e.target.value })}
          required
          placeholder="0.00"
          helperText="Total amount paid for this asset"
        />
        
        {/* Optional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Purchase Date (Optional)"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
          />
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g., Investment grade gold bars, tech sector, etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        
        {/* Helper Text */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> {assetClass === 'stock' && 'Ticker is required for stocks.'}
            {assetClass === 'metal' && 'Unit (oz, g, kg) is required for metals.'}
            {assetClass === 'crypto' && 'Enter crypto symbol for reference.'}
            {!['stock', 'metal', 'crypto'].includes(assetClass) && 'Fill in available information for your asset type.'}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
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

// Valuation Section Component (AI-Ready)
interface ValuationSectionProps {
  valuation: any; // AssetValuationData
}

function ValuationSection({ valuation }: ValuationSectionProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="space-y-2">
        {/* Current Value */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Current Value</span>
          <span className="text-sm font-semibold text-gray-900">
            {valuation?.currentValue ? `$${valuation.currentValue.toFixed(2)}` : '—'}
          </span>
        </div>
        
        {/* ROI */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">ROI</span>
          <span className={`text-sm font-semibold ${
            valuation?.roiPercentage
              ? valuation.roiPercentage >= 0
                ? 'text-green-600'
                : 'text-red-600'
              : 'text-gray-900'
          }`}>
            {valuation?.roiPercentage ? `${valuation.roiPercentage.toFixed(2)}%` : '—'}
          </span>
        </div>
        
        {/* Status Badge */}
        <div className="pt-2">
          <div className="flex items-center gap-2">
            <Badge 
              variant="warning"
              className="text-xs"
            >
              Valuation coming soon
            </Badge>
            <button
              type="button"
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="mt-2 p-2 text-xs text-gray-700 bg-gray-50 rounded border border-gray-200">
              ROI requires current market price. This will be calculated automatically once market data integration is added.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
