import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiClient';
import { Asset, CreateAssetRequest, PortfolioRoiItemDto } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatPercent, formatDateTime } from '../lib/utils';
import { usePortfolioRoi } from '../hooks/useMarketQuotes';

export function AssetsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiFetch<Asset[]>('/assets'),
  });
  
  // Fetch portfolio ROI (current value + ROI, auto-includes currency)
  const { data: portfolioRoi, isLoading: isRoiLoading } = usePortfolioRoi();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t('assets.title')}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {(assets || []).length === 1
                  ? t('assets.count', { count: (assets || []).length })
                  : t('assets.countPlural', { count: (assets || []).length })}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('assets.new')}
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
              // Match ROI/quote data to asset
              const valuation = portfolioRoi?.items.find((v) => v.assetId === asset.id);
              
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{asset.name}</h3>
                        
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('assets.quantity')}</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {asset.quantity} {asset.unit ? asset.unit : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('assets.costBasis')}</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          ${asset.costBasisTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    {(asset.purchaseDate || asset.notes) && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        {asset.purchaseDate && (
                          <p>{t('assets.purchased')} {new Date(asset.purchaseDate).toLocaleDateString()}</p>
                        )}
                        {asset.notes && <p className="italic">{asset.notes}</p>}
                      </div>
                    )}
                    
                    {/* Valuation Section (AI-Ready) */}
                    <ValuationSection valuation={valuation} isLoading={isRoiLoading} />
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
              title={t('assets.noAssets')}
              description={t('assets.noAssetsDescription')}
              action={{
                label: t('assets.createAsset'),
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
  const { t } = useTranslation();
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
      showToast(t('assets.createSuccess'), 'success');
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
      showToast(t('common.required'), 'error');
      return;
    }
    
    if (!formData.assetClass.trim()) {
      showToast(t('common.required'), 'error');
      return;
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      showToast(t('common.required'), 'error');
      return;
    }
    
    if (!formData.costBasisTotal || parseFloat(formData.costBasisTotal) < 0) {
      showToast(t('common.required'), 'error');
      return;
    }
    
    const assetClass = formData.assetClass.toLowerCase();
    
    // Stock-specific validation
    if (assetClass === 'stock' && !formData.ticker.trim()) {
      showToast(t('assets.createModal.noteStock'), 'error');
      return;
    }
    
      // Metal (gold) validation: require unit and ticker (default XAU if empty)
      if (assetClass === 'metal') {
        const unitMissing = !formData.unit.trim();
        const tickerMissing = !formData.ticker.trim();
        if (unitMissing || tickerMissing) {
          showToast(t('assets.createModal.noteMetal'), 'error');
          return;
        }
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
    <Modal isOpen onClose={onClose} title={t('assets.createModal.title')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            label={t('assets.createModal.assetName')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder={t('assets.createModal.placeholder')}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              {t('assets.createModal.assetClass')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assetClass}
              onChange={(e) => {
                const nextClass = e.target.value;
                setFormData({
                  ...formData,
                  assetClass: nextClass,
                  unit: nextClass === 'stock' ? 'shares' : 'oz',
                  ticker: nextClass === 'stock' ? '' : 'XAU',
                });
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[var(--accent-color,#4f46e5)] focus:border-transparent transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="stock">Stock</option>
              <option value="metal">Gold</option>
            </select>
          </div>
        </div>
        
        {/* Asset Class Specific Fields */}
        {assetClass === 'stock' && (
            <Input
              type="text"
              label={t('assets.createModal.tickerRequired')}
            value={formData.ticker}
            onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
            required
            placeholder="e.g., AAPL"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              {t('assets.createModal.unit')} {assetClass === 'metal' && <span className="text-red-500">*</span>}
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
                placeholder="e.g., oz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            )}
          </div>
        </div>
        
        {/* Cost Basis */}
        <Input
          type="number"
          step="0.01"
          label={t('assets.createModal.totalCostBasis')}
          value={formData.costBasisTotal}
          onChange={(e) => setFormData({ ...formData, costBasisTotal: e.target.value })}
          required
          placeholder="0.00"
          helperText={t('assets.createModal.helper')}
        />
        
        {/* Optional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label={t('assets.createModal.purchaseDate')}
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
          />
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            {t('assets.createModal.notes')}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g., Investment grade gold bars, tech sector, etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[var(--accent-color,#4f46e5)] focus:border-transparent transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>
        
        {/* Helper Text */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <strong>Note:</strong> {assetClass === 'stock' && t('assets.createModal.noteStock')}
            {assetClass === 'metal' && t('assets.createModal.noteMetal')}
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
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            {t('assets.createModal.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Valuation Section Component (live market data)
interface ValuationSectionProps {
  valuation?: PortfolioRoiItemDto;
  isLoading: boolean;
}

function ValuationSection({ valuation, isLoading }: ValuationSectionProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  const currentValue = valuation?.currentValue;
  const roiPercent = valuation?.roiPercent;
  const asOf = valuation?.quoteAsOfUtc;

  const roiColor = roiPercent === null || roiPercent === undefined
    ? 'text-gray-900 dark:text-gray-100'
    : roiPercent >= 0
      ? 'text-green-600'
      : 'text-red-600';

  return (
    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
      <div className="space-y-2">
        {/* Current Value */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">{t('assets.currentValue')}</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {currentValue !== null && currentValue !== undefined ? formatCurrency(currentValue) : '—'}
          </span>
        </div>

        {/* ROI */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">{t('assets.roi')}</span>
          <span className={`text-sm font-semibold ${roiColor}`}>
            {formatPercent(roiPercent)}
          </span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {valuation?.isQuoteStale && (
            <span title={t('common.cachedTooltip')}>
              <Badge variant="warning" className="text-xs">
                {t('common.cached')}
              </Badge>
            </span>
          )}
          {valuation?.error && (
            <Badge variant="danger" className="text-xs">
              {t('common.error')}
            </Badge>
          )}
          {asOf && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {formatDateTime(asOf)}
            </span>
          )}
        </div>

        {valuation?.error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{valuation.error}</p>
        )}
      </div>
    </div>
  );
}
