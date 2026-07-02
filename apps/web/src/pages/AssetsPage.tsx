import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { apiFetch } from '../lib/apiClient';
import { useChartTheme } from '../lib/chartTheme';
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
        method: 'PATCH',
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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink">{t('assets.title')}</h1>
            <p className="mt-1 text-sm text-ink-muted">
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

  const gainClass = gain >= 0 ? 'text-success' : 'text-danger';
  const asOfLabel = asOfTimestamp
    ? t('assets.asOf', { date: formatDateTime(asOfTimestamp) })
    : t('assets.asOfPending');

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">{t('assets.totalWorth')}</p>
          <p className="mt-1 font-display text-3xl text-ink tnum">
            {formatCurrency(totalWorth)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">{t('assets.changePlaceholder')}</p>
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
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`text-sm font-semibold tnum text-ink ${subtle ? 'font-normal text-ink-muted' : ''} ${valueClass ?? ''}`}>
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
  const theme = useChartTheme();
  if (loading) {
    return <CardSkeleton />;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <h3 className="eyebrow mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-ink-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-44 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={theme.colors[index % theme.colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: theme.tooltip.bg,
                    border: `1px solid ${theme.tooltip.border}`,
                    borderRadius: 8,
                    color: theme.tooltip.text,
                  }}
                  formatter={((value: number) => [formatCurrency(typeof value === 'number' ? value : 0), '']) as never}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-xl text-ink tnum">{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-1.5">
            {data.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: theme.colors[index % theme.colors.length] }} />
                  <span className="truncate capitalize text-ink-muted">{entry.name}</span>
                </span>
                <span className="font-mono tnum text-ink-faint">
                  {total > 0 ? `${((entry.value / total) * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
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
    <Card>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('assets.searchPlaceholder')}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <span>{t('assets.sortLabel')}</span>
          <div className="flex gap-0.5 rounded-md bg-app-elevated p-0.5">
            {(['value', 'gain', 'roi'] as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  sortKey === key ? 'bg-app-surface text-accent shadow-card' : 'text-ink-muted hover:text-ink'
                }`}
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
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  <th className="py-3">{t('assets.table.asset')}</th>
                  <th className="py-3 text-right">{t('assets.table.quantity')}</th>
                  <th className="py-3 text-right">{t('assets.table.price')}</th>
                  <th className="py-3 text-right">{t('assets.table.value')}</th>
                  <th className="py-3 text-right">{t('assets.table.gain')}</th>
                  <th className="py-3 text-right">{t('assets.table.roi')}</th>
                  <th className="py-3 text-right">{t('assets.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {assets.map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-app-elevated">
                    <td className="py-3">
                      <div className="font-semibold text-ink">{asset.name}</div>
                      <div className="font-mono text-xs uppercase text-ink-faint">
                        {[asset.ticker, asset.assetClass].filter(Boolean).join(' • ')}
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono tnum text-ink">
                      {asset.quantity} {asset.unit ?? ''}
                    </td>
                    <td className="py-3 text-right font-mono tnum text-ink">
                      {asset.unitPrice ? (
                        formatCurrency(asset.unitPrice)
                      ) : (
                        <Badge variant="info">{t('assets.table.noPrice')}</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold tnum text-ink">
                      {asset.currentValue ? formatCurrency(asset.currentValue) : '—'}
                      {asset.isQuoteStale && (
                        <Badge variant="warning" className="ml-2">
                          {t('assets.table.cached')}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono tnum">
                      {asset.unrealizedGain === null ? (
                        <span className="text-ink-faint">—</span>
                      ) : (
                        <span className={asset.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(asset.unrealizedGain)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <RoiBadge roi={asset.roiPercent} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
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

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {assets.map((asset) => (
              <div key={asset.id} className="space-y-3 rounded-md border border-line bg-app-surface p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-ink">{asset.name}</div>
                    <div className="mt-0.5 font-mono text-xs uppercase text-ink-faint">
                      {[asset.ticker, asset.assetClass].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                  {asset.isQuoteStale && (
                    <Badge variant="warning" className="text-xs">
                      {t('assets.table.cached')}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-muted">{t('assets.table.quantity')}</div>
                    <div className="font-mono font-medium tnum text-ink">{asset.quantity} {asset.unit ?? ''}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">{t('assets.table.price')}</div>
                    <div className="font-mono font-medium tnum text-ink">
                      {asset.unitPrice ? formatCurrency(asset.unitPrice) : <Badge variant="info">{t('assets.table.noPrice')}</Badge>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">{t('assets.table.value')}</div>
                    <div className="font-mono font-semibold tnum text-ink">
                      {asset.currentValue ? formatCurrency(asset.currentValue) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">{t('assets.table.gain')}</div>
                    <div className="font-mono font-medium tnum">
                      {asset.unrealizedGain === null ? (
                        <span className="text-ink-faint">—</span>
                      ) : (
                        <span className={asset.unrealizedGain >= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(asset.unrealizedGain)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-ink-muted">{t('assets.table.roi')}</div>
                    <RoiBadge roi={asset.roiPercent} />
                  </div>
                </div>

                <div className="flex gap-2 border-t border-line pt-2">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(asset)} className="flex-1">
                    {t('assets.actions.edit')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(asset)} className="flex-1">
                    {t('assets.actions.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function RoiBadge({ roi }: { roi: number | null }) {
  if (roi === null || roi === undefined) {
    return <span className="font-mono text-sm text-ink-faint tnum">—</span>;
  }
  const positive = roi >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-medium tnum ${
        positive ? 'text-success' : 'text-danger'
      }`}
      style={{ background: 'var(--accent-soft)' }}
    >
      {positive ? '▲' : '▼'} {formatPercent(Math.abs(roi))}
    </span>
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
          placeholder="e.g., Apple Stock, Gold Bullion"
          required
        />
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-muted">{t('assets.createModal.assetClass')} <span className="text-danger">*</span></label>
          <Select
            value={values.assetClass}
            onChange={(e) => handleChange('assetClass', e.target.value)}
            options={[
              { value: '', label: 'Select asset class...' },
              { value: 'stock', label: 'Stock / ETF' },
              { value: 'metal', label: 'Gold' },
            ]}
          />
          {errors.assetClass && <p className="text-xs text-danger">{errors.assetClass}</p>}
        </div>
        <AssetFormField
          label={t('assets.createModal.ticker')}
          value={values.ticker}
          onChange={(value) => handleChange('ticker', value)}
          helper="Required for stocks"
          placeholder="e.g., AAPL, MSFT"
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetFormField
            label="Number of Shares/Units"
            value={values.quantity}
            onChange={(value) => handleChange('quantity', value)}
            type="number"
            error={errors.quantity}
            placeholder="e.g., 100"
            required
          />
          {values.assetClass === 'stock' ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-muted">
                {t('assets.createModal.unit')}
              </label>
              <div className="w-full rounded-md border border-line bg-app-elevated px-3.5 py-2 text-sm text-ink-muted">
                Shares
              </div>
            </div>
          ) : values.assetClass === 'metal' ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-muted">
                {t('assets.createModal.unit')}
                <span className="ml-1 text-danger">*</span>
              </label>
              <Select
                value={values.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                options={[
                  { value: '', label: 'Select unit...' },
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
          placeholder="e.g., 15000"
          helper="Total cost for all units"
          required
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
          placeholder="Additional information about this asset"
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
  placeholder?: string;
  required?: boolean;
}

function AssetFormField({ label, value, onChange, error, helper, type = 'text', multiline, placeholder, required }: AssetFormFieldProps) {
  const field = multiline ? (
    <textarea
      className="w-full resize-none rounded-md border border-line-strong bg-app-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ) : (
    <Input value={value} type={type} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  );
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-ink-muted">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
        {!required && <span className="ml-1 text-xs text-ink-faint">(optional)</span>}
      </label>
      {field}
      {helper && <p className="text-xs text-ink-muted">{helper}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
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
  const theme = useChartTheme();
  if (loading) {
    return <CardSkeleton />;
  }

  if (data.length === 0) {
    return (
      <Card>
        <h3 className="eyebrow mb-4">{title}</h3>
        <p className="text-sm text-ink-muted">{emptyLabel}</p>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card>
      <h3 className="eyebrow mb-4">{title}</h3>
      <div className="space-y-4">
        {sorted.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-medium text-ink">
                <span className="capitalize">{item.name}</span>
                <span className="font-mono text-xs tnum text-ink-muted">
                  {formatCurrency(item.value)} · {formatPercent(percentage)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-app-elevated">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: theme.colors[index % theme.colors.length],
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
