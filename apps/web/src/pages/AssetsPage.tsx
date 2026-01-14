import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { apiFetch } from '../lib/apiClient';
import { Asset, CreateAssetRequest, PortfolioRoiItemDto } from '../types/api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatPercent, formatDateTime } from '../lib/utils';
import { usePortfolioRoi } from '../hooks/useMarketQuotes';

const ALLOCATION_COLORS = ['#3b82f6', '#a855f7', '#f97316', '#22c55e', '#0ea5e9', '#ec4899', '#facc15'];

// TODO: Move sector classification to backend quotes service once sector metadata is exposed.
const SECTOR_MAP: Record<string, string> = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  GOOGL: 'Communication Services',
  AMZN: 'Consumer Discretionary',
  TSLA: 'Consumer Discretionary',
  META: 'Communication Services',
  JPM: 'Financials',
  BAC: 'Financials',
  NVDA: 'Technology',
  NFLX: 'Communication Services',
};

const ASSET_CLASS_STOCK = 'stock';
const UNKNOWN_KEY = '__unknown__';

type SortKey = 'value' | 'gain' | 'roi';

type AssetFormValues = {
  name: string;
  assetClass: string;
  ticker: string;
  quantity: string;
  unit: string;
  costBasisTotal: string;
  purchaseDate: string;
  notes: string;
};

interface EnrichedAsset extends Asset {
  valuation?: PortfolioRoiItemDto;
  currentValue: number | null;
  unitPrice: number | null;
  unrealizedGain: number | null;
  roiPercent: number | null;
  isQuoteStale: boolean;
  quoteAsOfUtc: string | null;
  error?: string | null;
  sector: string;
}

const defaultFormValues: AssetFormValues = {
  name: '',
  assetClass: '',
  ticker: '',
  quantity: '',
  unit: '',
  costBasisTotal: '',
  purchaseDate: '',
  notes: '',
};

export function AssetsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiFetch<Asset[]>('/assets'),
  });

  const {
    data: portfolioRoi,
    isLoading: roiLoading,
  } = usePortfolioRoi();

  const valuationsById = useMemo(() => {
    const map = new Map<string, PortfolioRoiItemDto>();
    if (portfolioRoi?.items) {
      for (const item of portfolioRoi.items) {
        map.set(item.assetId, item);
      }
    }
    return map;
  }, [portfolioRoi]);

  const enrichedAssets: EnrichedAsset[] = useMemo(() => {
    return assets.map((asset) => {
      const valuation = valuationsById.get(asset.id);
      const currentValue = valuation?.currentValue ?? null;
      const unitPrice = valuation?.unitPrice ?? null;
      const unrealizedGain = valuation?.unrealizedGain ?? null;
      const roiPercent = valuation?.roiPercent ?? null;
      const isQuoteStale = valuation?.isQuoteStale ?? false;
      const quoteAsOfUtc = valuation?.quoteAsOfUtc ?? null;
      const error = valuation?.error ?? null;
      const sector = inferSector(asset, valuation);

      return {
        ...asset,
        valuation,
        currentValue,
        unitPrice,
        unrealizedGain,
        roiPercent,
        isQuoteStale,
        quoteAsOfUtc,
        error,
        sector,
      };
    });
  }, [assets, valuationsById]);

  const totals = portfolioRoi?.totals;
  const totalWorth = totals?.currentValueTotal ?? 0;
  const totalCostBasis = totals?.costBasisTotal ?? 0;
  const totalGain = totals?.unrealizedGainTotal ?? 0;
  const totalRoiPercent = totals?.roiPercentTotal ?? 0;

  const latestAsOf = useMemo(() => {
    const timestamps = enrichedAssets
      .map((asset) => asset.quoteAsOfUtc)
      .filter((ts): ts is string => Boolean(ts));
    if (!timestamps.length) return null;
    return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [enrichedAssets]);

  const anyStale = enrichedAssets.some((asset) => asset.isQuoteStale);

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? enrichedAssets.filter((asset) =>
          [asset.name, asset.ticker, asset.assetClass]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term))
        )
      : enrichedAssets;

    const sorted = [...base].sort((a, b) => {
      const metricA = getMetricValue(a, sortKey);
      const metricB = getMetricValue(b, sortKey);
      if (metricA === metricB) return 0;
      return sortDir === 'asc' ? metricA - metricB : metricB - metricA;
    });

    return sorted;
  }, [enrichedAssets, search, sortKey, sortDir]);

  const unknownLabel = t('assets.unknownLabel');
  const allocationByClass = useMemo(
    () => buildAllocationData(enrichedAssets, (asset) => asset.assetClass, unknownLabel),
    [enrichedAssets, unknownLabel]
  );
  const allocationBySector = useMemo(
    () =>
      buildAllocationData(
        enrichedAssets.filter((asset) => asset.assetClass.toLowerCase() === ASSET_CLASS_STOCK),
        (asset) => asset.sector,
        unknownLabel
      ),
    [enrichedAssets, unknownLabel]
  );

  const createAssetMutation = useMutation({
    mutationFn: (payload: CreateAssetRequest) =>
      apiFetch<Asset>('/assets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      showToast(t('assets.createSuccess'), 'success');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-roi'] });
      setShowCreateModal(false);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateAssetRequest }) =>
      apiFetch<Asset>(`/assets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      showToast(t('assets.actions.editSuccess'), 'success');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-roi'] });
      setEditingAsset(null);
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/assets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      showToast(t('assets.delete.success'), 'success');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-roi'] });
      setPendingDelete(null);
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const summaryLoading = assetsLoading || roiLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t('assets.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(
                assets.length === 1 ? 'assets.count' : 'assets.countPlural',
                { count: assets.length }
              )}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>{t('assets.actions.add')}</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-1">
            <PortfolioSummaryCard
              loading={summaryLoading}
              totalWorth={totalWorth}
              costBasis={totalCostBasis}
              gain={totalGain}
              roiPercent={totalRoiPercent}
              asOfTimestamp={latestAsOf}
              cached={anyStale}
            />
            <AllocationCard
              title={t('assets.allocationsByClass')}
              loading={summaryLoading}
              data={allocationByClass}
              emptyLabel={t('assets.allocationsEmpty')}
            />
            <SectorBreakdownCard
              title={t('assets.allocationsBySector')}
              loading={summaryLoading}
              data={allocationBySector}
              emptyLabel={t('assets.allocationsSectorEmpty')}
            />
          </div>

          <div className="lg:col-span-2">
            <AssetsTableCard
              loading={assetsLoading}
              assets={filteredAssets}
              search={search}
              onSearchChange={setSearch}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(key) => handleSortChange(key, sortKey, sortDir, setSortKey, setSortDir)}
              onEdit={setEditingAsset}
              onDelete={setPendingDelete}
            />
          </div>
        </div>
      </div>

      {showCreateModal && (
        <AssetModal
          isOpen
          title={t('assets.createModal.title')}
          submitLabel={t('assets.createModal.create')}
          initialValues={defaultFormValues}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (values) => {
            await createAssetMutation.mutateAsync(buildAssetPayload(values));
          }}
          submitting={createAssetMutation.isPending}
        />
      )}

      {editingAsset && (
        <AssetModal
          isOpen
          title={t('assets.edit.title')}
          submitLabel={t('assets.edit.save')}
          initialValues={mapAssetToForm(editingAsset)}
          onClose={() => setEditingAsset(null)}
          onSubmit={async (values) => {
            await updateAssetMutation.mutateAsync({
              id: editingAsset.id,
              payload: buildAssetPayload(values),
            });
          }}
          submitting={updateAssetMutation.isPending}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          isOpen
          onClose={() => setPendingDelete(null)}
          onConfirm={() => deleteAssetMutation.mutate(pendingDelete.id)}
          title={t('assets.delete.title', { name: pendingDelete.name })}
          message={t('assets.delete.confirm')}
          confirmText={t('assets.delete.confirmButton')}
          cancelText={t('assets.delete.cancel')}
          variant="danger"
          isProcessing={deleteAssetMutation.isPending}
        />
      )}
    </div>
  );
}

interface PortfolioSummaryCardProps {
  loading: boolean;
  totalWorth: number;
  costBasis: number;
  gain: number;
  roiPercent: number | null;
  asOfTimestamp: string | null;
  cached: boolean;
}

function PortfolioSummaryCard({
  loading,
  totalWorth,
  costBasis,
  gain,
  roiPercent,
  asOfTimestamp,
  cached,
}: PortfolioSummaryCardProps) {
  const { t } = useTranslation();
  if (loading) {
    return <CardSkeleton />;
  }

  const gainClass = gain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const asOfLabel = asOfTimestamp
    ? t('assets.asOf', { date: formatDateTime(asOfTimestamp) })
    : t('assets.asOfPending');

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('assets.totalWorth')}</p>
          <p className="text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {formatCurrency(totalWorth)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('assets.changePlaceholder')}</p>
        </div>
        {cached && <Badge variant="warning">{t('assets.cached')}</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <SummaryStat label={t('assets.costBasis')} value={formatCurrency(costBasis)} />
        <SummaryStat label={t('assets.unrealizedGain')} value={formatCurrency(gain)} valueClass={gainClass} />
        <SummaryStat label={t('assets.roi')} value={formatPercent(roiPercent ?? null)} />
        <SummaryStat label={t('assets.summary.asOfLabel')} value={asOfLabel} subtle />
      </div>
    </Card>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
  valueClass?: string;
  subtle?: boolean;
}

function SummaryStat({ label, value, valueClass, subtle }: SummaryStatProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-sm font-semibold text-gray-900 dark:text-gray-100 ${subtle ? 'font-normal' : ''} ${valueClass ?? ''}`}>
        {value}
      </p>
    </div>
  );
}

interface AllocationCardProps {
  title: string;
  loading: boolean;
  data: AllocationDatum[];
  emptyLabel: string;
}

interface AllocationDatum {
  name: string;
  value: number;
  [key: string]: string | number;
}

function AllocationCard({ title, loading, data, emptyLabel }: AllocationCardProps) {
  if (loading) {
    return <CardSkeleton />;
  }

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie dataKey="value" data={data} outerRadius={80} label={(entry) => `${entry.name}` }>
                {data.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

interface AssetsTableCardProps {
  loading: boolean;
  assets: EnrichedAsset[];
  search: string;
  onSearchChange: (value: string) => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSortChange: (key: SortKey) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

function AssetsTableCard({
  loading,
  assets,
  search,
  onSearchChange,
  sortKey,
  sortDir,
  onSortChange,
  onEdit,
  onDelete,
}: AssetsTableCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('assets.searchPlaceholder')}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{t('assets.sortLabel')}</span>
          <div className="flex rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['value', 'gain', 'roi'] as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`px-3 py-1 text-xs font-medium ${sortKey === key ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : ''}`}
                onClick={() => onSortChange(key)}
              >
                {t(`assets.sort.${key}`)} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : assets.length === 0 ? (
        <EmptyState
          title={t('assets.empty.title')}
          description={t('assets.empty.body')}
          icon={
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="py-3">{t('assets.table.asset')}</th>
                <th className="py-3">{t('assets.table.quantity')}</th>
                <th className="py-3">{t('assets.table.price')}</th>
                <th className="py-3">{t('assets.table.value')}</th>
                <th className="py-3">{t('assets.table.gain')}</th>
                <th className="py-3">{t('assets.table.roi')}</th>
                <th className="py-3 text-right">{t('assets.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                  <td className="py-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{asset.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {[asset.ticker, asset.assetClass].filter(Boolean).join(' • ')}
                    </div>
                  </td>
                  <td className="py-3 text-gray-900 dark:text-gray-100">
                    {asset.quantity} {asset.unit ?? ''}
                  </td>
                  <td className="py-3">
                    {asset.unitPrice ? (
                      formatCurrency(asset.unitPrice)
                    ) : (
                      <Badge variant="info">{t('assets.table.noPrice')}</Badge>
                    )}
                  </td>
                  <td className="py-3 font-semibold text-gray-900 dark:text-gray-50">
                    {asset.currentValue ? formatCurrency(asset.currentValue) : '—'}
                    {asset.isQuoteStale && (
                      <Badge variant="warning" className="ml-2">
                        {t('assets.table.cached')}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3">
                    {asset.unrealizedGain === null ? (
                      '—'
                    ) : (
                      <span className={asset.unrealizedGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {formatCurrency(asset.unrealizedGain)}
                      </span>
                    )}
                  </td>
                  <td className="py-3">{formatPercent(asset.roiPercent)}</td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(asset)}>
                        {t('assets.actions.edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(asset)}>
                        {t('assets.actions.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

interface AssetModalProps {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  initialValues: AssetFormValues;
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => Promise<void>;
  submitting: boolean;
}

function AssetModal({ isOpen, title, submitLabel, initialValues, onClose, onSubmit, submitting }: AssetModalProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<AssetFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const handleChange = (key: keyof AssetFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const validationErrors: Record<string, string> = {};
    if (!values.name.trim()) validationErrors.name = t('common.required');
    if (!values.assetClass.trim()) validationErrors.assetClass = t('common.required');
    if (!values.quantity || Number(values.quantity) < 0) validationErrors.quantity = t('common.required');
    if (!values.costBasisTotal || Number(values.costBasisTotal) < 0) validationErrors.costBasisTotal = t('common.required');

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Asset modal submission failed', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('assets.edit.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('common.loading') : submitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AssetFormField
          label={t('assets.createModal.assetName')}
          value={values.name}
          onChange={(value) => handleChange('name', value)}
          error={errors.name}
        />
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('assets.createModal.assetClass')} <span className="text-red-500">*</span></label>
          <Select
            value={values.assetClass}
            onChange={(e) => handleChange('assetClass', e.target.value)}
            options={[
              { value: '', label: 'Select asset class...' },
              { value: 'stock', label: 'Stock / ETF' },
              { value: 'metal', label: 'Gold' },
            ]}
          />
          {errors.assetClass && <p className="text-xs text-red-500">{errors.assetClass}</p>}
        </div>
        <AssetFormField
          label={t('assets.createModal.ticker')}
          value={values.ticker}
          onChange={(value) => handleChange('ticker', value)}
          helper={t('assets.createModal.tickerOptional')}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetFormField
            label={t('assets.quantity')}
            value={values.quantity}
            onChange={(value) => handleChange('quantity', value)}
            type="number"
            error={errors.quantity}
          />
          {values.assetClass === 'stock' ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('assets.createModal.unit')}</label>
              <div className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-300">
                Share
              </div>
            </div>
          ) : values.assetClass === 'metal' ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('assets.createModal.unit')}</label>
              <Select
                value={values.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                options={[
                  { value: 'oz', label: 'Troy Ounce (oz)' },
                  { value: 'g', label: 'Gram (g)' },
                  { value: 'kg', label: 'Kilogram (kg)' },
                ]}
              />
            </div>
          ) : (
            <AssetFormField
              label={t('assets.createModal.unit')}
              value={values.unit}
              onChange={(value) => handleChange('unit', value)}
            />
          )}
        </div>
        <AssetFormField
          label={t('assets.createModal.totalCostBasis')}
          value={values.costBasisTotal}
          onChange={(value) => handleChange('costBasisTotal', value)}
          type="number"
          error={errors.costBasisTotal}
        />
        <AssetFormField
          label={t('assets.createModal.purchaseDate')}
          value={values.purchaseDate}
          onChange={(value) => handleChange('purchaseDate', value)}
          type="date"
        />
        <AssetFormField
          label={t('assets.createModal.notes')}
          value={values.notes}
          onChange={(value) => handleChange('notes', value)}
          multiline
        />
      </div>
    </Modal>
  );
}

interface AssetFormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  type?: string;
  multiline?: boolean;
}

function AssetFormField({ label, value, onChange, error, helper, type = 'text', multiline }: AssetFormFieldProps) {
  const field = multiline ? (
    <textarea
      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <Input value={value} type={type} onChange={(e) => onChange(e.target.value)} />
  );
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
      {field}
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function buildAssetPayload(values: AssetFormValues): CreateAssetRequest {
  return {
    name: values.name.trim(),
    assetClass: values.assetClass.trim(),
    ticker: values.ticker.trim() || undefined,
    quantity: Number(values.quantity),
    unit: values.assetClass === 'stock' ? 'share' : (values.unit.trim() || undefined),
    costBasisTotal: Number(values.costBasisTotal),
    purchaseDate: values.purchaseDate.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

function mapAssetToForm(asset: Asset): AssetFormValues {
  return {
    name: asset.name,
    assetClass: asset.assetClass,
    ticker: asset.ticker ?? '',
    quantity: asset.quantity.toString(),
    unit: asset.assetClass === 'stock' ? 'share' : (asset.unit ?? ''),
    costBasisTotal: asset.costBasisTotal.toString(),
    purchaseDate: asset.purchaseDate ?? '',
    notes: asset.notes ?? '',
  };
}

function getMetricValue(asset: EnrichedAsset, key: SortKey) {
  switch (key) {
    case 'value':
      return asset.currentValue ?? 0;
    case 'gain':
      return asset.unrealizedGain ?? 0;
    case 'roi':
      return asset.roiPercent ?? -Infinity;
    default:
      return 0;
  }
}

function handleSortChange(
  key: SortKey,
  currentKey: SortKey,
  currentDir: 'asc' | 'desc',
  setKey: (key: SortKey) => void,
  setDir: (dir: 'asc' | 'desc') => void
) {
  if (currentKey === key) {
    setDir(currentDir === 'asc' ? 'desc' : 'asc');
  } else {
    setKey(key);
    setDir('desc');
  }
}

function buildAllocationData(
  assets: EnrichedAsset[],
  selector: (asset: EnrichedAsset) => string,
  unknownLabel: string
) {
  const buckets = new Map<string, number>();
  for (const asset of assets) {
    const key = selector(asset) || UNKNOWN_KEY;
    const value = asset.currentValue ?? asset.costBasisTotal;
    buckets.set(key, (buckets.get(key) ?? 0) + value);
  }
  return Array.from(buckets.entries())
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name: name === UNKNOWN_KEY ? unknownLabel : name, value }));
}

function inferSector(asset: Asset, valuation?: PortfolioRoiItemDto): string {
  if (!asset) return 'Unknown';
  const ticker = (asset.ticker || valuation?.ticker || '').toUpperCase();
  if (!ticker) return UNKNOWN_KEY;
  return SECTOR_MAP[ticker] ?? UNKNOWN_KEY;
}

interface SectorBreakdownCardProps extends AllocationCardProps {}

function SectorBreakdownCard({ title, loading, data, emptyLabel }: SectorBreakdownCardProps) {
  if (loading) {
    return <CardSkeleton />;
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <div className="space-y-4">
        {sorted.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-100">
                <span>{item.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(item.value)} · {formatPercent(percentage)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
