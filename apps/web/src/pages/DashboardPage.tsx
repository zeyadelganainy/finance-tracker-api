import { useEffect, useState } from 'react';
import { format, parse, subMonths } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { useChartTheme, CHART_DEFAULTS, formatCompactCurrency } from '../lib/chartTheme';
import { useCountUp } from '../hooks/useCountUp';
import { NetWorthHistoryResponse, MonthlySummary, NetWorthDataPoint } from '../types/api';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useAIContext } from '../hooks/useAI';
import { useAuth } from '../auth/AuthProvider';
import { EmptyState } from '../components/ui/EmptyState';

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
}

function ChartTooltip({
  active,
  rows,
}: {
  active?: boolean;
  rows: { label: string; value: string; sub?: string }[];
}) {
  const theme = useChartTheme();
  if (!active) return null;
  return (
    <div
      className="rounded-md px-3 py-2 text-sm shadow-pop"
      style={{ background: theme.tooltip.bg, border: `1px solid ${theme.tooltip.border}`, color: theme.tooltip.text }}
    >
      {rows.map((r, i) => (
        <div key={i} className={i > 0 ? 'mt-1' : ''}>
          <div className="text-[0.6875rem] uppercase tracking-wide" style={{ color: theme.axis }}>
            {r.label}
          </div>
          <div className="font-mono font-semibold tnum">{r.value}</div>
          {r.sub && <div className="text-xs" style={{ color: theme.axis }}>{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const theme = useChartTheme();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [netWorthRange, setNetWorthRange] = useState<'1w' | '1m' | '3m' | '6m'>('1m');
  const [netWorthData, setNetWorthData] = useState<NetWorthHistoryResponse | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

  const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  useAIContext(!!user);

  useEffect(() => {
    setNetWorthData(null);
    setMonthlySummary(null);
    setError(null);
    setLoading(true);

    if (authLoading) return;
    if (!user || !accessToken) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchDashboard = async () => {
      try {
        const [networth, summary] = await Promise.all([
          apiFetch<NetWorthHistoryResponse>(`/networth/history?from=${sixMonthsAgo}&to=${today}`, { signal: controller.signal }),
          apiFetch<MonthlySummary>(`/summary/monthly?month=${selectedMonth}`, { signal: controller.signal }),
        ]);
        setNetWorthData(networth);
        setMonthlySummary(summary);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        if (message.startsWith('404')) {
          setNetWorthData({ from: sixMonthsAgo, to: today, interval: 'daily', dataPoints: [] });
          setMonthlySummary({ month: selectedMonth, totalIncome: 0, totalExpenses: 0, net: 0, expenseBreakdown: [] });
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, [user?.id, accessToken, selectedMonth, authLoading, sixMonthsAgo, today]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') };
  });

  const netWorthPoints = netWorthData?.dataPoints ?? [];
  const rangeDays = { '1w': 7, '1m': 30, '3m': 90, '6m': 180 };
  const rangeStartDate = subMonths(new Date(), rangeDays[netWorthRange] / 30);
  const filteredNetWorthPoints = netWorthPoints.filter((point) => new Date(point.date) >= rangeStartDate);

  const netWorthChartData = filteredNetWorthPoints.map((point: NetWorthDataPoint) => ({
    date: format(new Date(point.date), 'MMM dd'),
    netWorth: point.netWorth,
  }));

  const { chartData: expenseChartData, totalExpense: expenseTotalExpense } = (() => {
    const breakdown = monthlySummary?.expenseBreakdown || [];
    if (breakdown.length === 0) return { chartData: [] as { name: string; value: number; share: number }[], totalExpense: 0 };

    const validCategories = breakdown
      .filter((item) => Math.abs(item.total) > 0)
      .map((item) => ({ name: item.categoryName, value: Math.abs(item.total) }));
    if (validCategories.length === 0) return { chartData: [], totalExpense: 0 };

    const totalExpense = validCategories.reduce((sum, item) => sum + item.value, 0);
    if (totalExpense === 0) return { chartData: [], totalExpense: 0 };

    const categorized = validCategories
      .map((item) => ({ name: item.name, value: item.value, share: item.value / totalExpense }))
      .sort((a, b) => b.value - a.value);

    const maxCategories = 6;
    const topCategories = categorized.slice(0, maxCategories);
    const remaining = categorized.slice(maxCategories);
    const small = topCategories.filter((c) => c.share < 0.01);
    const major = topCategories.filter((c) => c.share >= 0.01);
    const other = [...small, ...remaining];
    if (other.length > 0) {
      const otherValue = other.reduce((s, c) => s + c.value, 0);
      major.push({ name: 'Other', value: otherValue, share: otherValue / totalExpense });
    }
    return { chartData: major, totalExpense };
  })();

  const selectedMonthDate = parse(selectedMonth, 'yyyy-MM', new Date());

  const latestNetWorth = filteredNetWorthPoints.length > 0 ? filteredNetWorthPoints[filteredNetWorthPoints.length - 1].netWorth : 0;
  const earliestNetWorth = filteredNetWorthPoints.length > 0 ? filteredNetWorthPoints[0].netWorth : 0;
  const netWorthChange = latestNetWorth - earliestNetWorth;
  const netWorthChangePercent =
    filteredNetWorthPoints.length > 1 && earliestNetWorth !== 0
      ? ((netWorthChange / Math.abs(earliestNetWorth)) * 100).toFixed(1)
      : null;

  const rangeComparisons = {
    '1w': t('dashboard.netWorthComparisons.1w'),
    '1m': t('dashboard.netWorthComparisons.1m'),
    '3m': t('dashboard.netWorthComparisons.3m'),
    '6m': t('dashboard.netWorthComparisons.6m'),
  };

  const hasEnoughHistory = filteredNetWorthPoints.length > 1;
  const netWorthUp = netWorthChange >= 0;

  const hasSummaryData =
    !!monthlySummary &&
    (monthlySummary.totalIncome !== 0 ||
      monthlySummary.totalExpenses !== 0 ||
      monthlySummary.net !== 0 ||
      (monthlySummary.expenseBreakdown?.length ?? 0) > 0);
  const hasData = netWorthPoints.length > 0 || hasSummaryData;

  const animatedNetWorth = useCountUp(latestNetWorth);

  const netMonth = monthlySummary?.net ?? 0;
  const activeDonut = hoveredCategory !== null ? expenseChartData[hoveredCategory] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Net worth hero */}
      <div className="mb-8 animate-rise-in">
        <p className="eyebrow">{t('dashboard.netWorth')}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
          <h1 className="font-display text-4xl tracking-tightest text-ink tnum md:text-5xl">
            {formatCurrency(animatedNetWorth)}
          </h1>
          {hasEnoughHistory && netWorthChangePercent && (
            <span
              className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tnum ${
                netWorthUp ? 'text-success' : 'text-danger'
              }`}
              style={{ background: 'var(--accent-soft)' }}
            >
              {netWorthUp ? '▲' : '▼'} {Math.abs(parseFloat(netWorthChangePercent))}% {rangeComparisons[netWorthRange]}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">{t('dashboard.subtitle')}</p>
      </div>

      {loading ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <CardSkeleton />
        </>
      ) : (
        <>
          {error && (
            <div className="mb-6 rounded-md border border-line bg-app-surface px-4 py-3 text-sm text-danger">{error}</div>
          )}

          {!error && !hasData && (
            <Card className="mb-8">
              <EmptyState title={t('dashboard.noDataTitle')} description={t('dashboard.noDataDescription')} />
            </Card>
          )}

          {/* Summary stat cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile
              label={t('dashboard.monthlyIncome')}
              value={formatCurrency(monthlySummary?.totalIncome || 0)}
              tone="success"
            />
            <SummaryTile
              label={t('dashboard.monthlyExpenses')}
              value={formatCurrency(Math.abs(monthlySummary?.totalExpenses || 0))}
              tone="danger"
            />
            <SummaryTile
              label={t('dashboard.netThisMonth')}
              value={formatCurrency(netMonth)}
              tone={netMonth >= 0 ? 'success' : 'danger'}
            />
          </div>

          {/* Month selector */}
          <div className="mb-6 max-w-xs">
            <Select
              label={t('dashboard.selectMonth')}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={monthOptions}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Net worth area chart — wider */}
            <Card
              className="lg:col-span-3"
              title={t('dashboard.netWorthOverTime')}
              actions={
                <div className="flex gap-1 rounded-md bg-app-elevated p-0.5">
                  {(['1w', '1m', '3m', '6m'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setNetWorthRange(range)}
                      className={`rounded px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition-colors ${
                        netWorthRange === range ? 'bg-app-surface text-accent shadow-card' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="h-72">
                {netWorthChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netWorthChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
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
                        content={({ active, payload }) => {
                          const p = payload as TooltipPayloadItem[] | undefined;
                          return (
                            <ChartTooltip
                              active={active}
                              rows={[{ label: t('dashboard.netWorth'), value: formatCurrency(Number(p?.[0]?.value ?? 0)) }]}
                            />
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="netWorth"
                        stroke={theme.accent}
                        strokeWidth={1.5}
                        fill="url(#nwFill)"
                        dot={false}
                        activeDot={{ r: 3, fill: theme.accent, stroke: theme.tooltip.bg, strokeWidth: 2 }}
                        isAnimationActive={CHART_DEFAULTS.animate}
                        animationDuration={CHART_DEFAULTS.animationDuration}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-ink-faint">
                    {t('dashboard.noNetWorthData')}
                  </div>
                )}
              </div>
            </Card>

            {/* Expense donut — narrower */}
            <Card
              className="lg:col-span-2"
              title={t('dashboard.expenseBreakdown')}
              description={format(selectedMonthDate, 'MMMM yyyy')}
            >
              {expenseChartData.length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius="62%"
                          outerRadius="88%"
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                          onMouseEnter={(_, index) => setHoveredCategory(index)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          isAnimationActive={CHART_DEFAULTS.animate}
                        >
                          {expenseChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.name === 'Other' ? theme.neutral : theme.colors[index % theme.colors.length]}
                              opacity={hoveredCategory === null || hoveredCategory === index ? 1 : 0.35}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-display text-2xl text-ink tnum">
                        {formatCurrency(activeDonut ? activeDonut.value : expenseTotalExpense)}
                      </span>
                      <span className="mt-0.5 max-w-[8rem] truncate text-xs text-ink-muted">
                        {activeDonut ? activeDonut.name : t('dashboard.monthlyExpenses')}
                      </span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
                    {expenseChartData.map((entry, index) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between gap-2 text-xs"
                        onMouseEnter={() => setHoveredCategory(index)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: entry.name === 'Other' ? theme.neutral : theme.colors[index % theme.colors.length] }}
                          />
                          <span className="truncate text-ink-muted">{entry.name}</span>
                        </span>
                        <span className="font-mono tnum text-ink-faint">{(entry.share * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center text-sm text-ink-faint">{t('dashboard.noExpenses')}</div>
              )}
            </Card>
          </div>

          {/* Top spending highlight */}
          {monthlySummary && monthlySummary.expenseBreakdown.length > 0 && (
            <Card className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">{t('dashboard.topSpendingCategory')}</p>
                  <p className="mt-1 text-sm text-ink-muted">{t('dashboard.topSpendingDescription')}</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl text-ink">{monthlySummary.expenseBreakdown[0].categoryName}</div>
                  <div className="font-mono text-lg font-semibold text-danger tnum">
                    {formatCurrency(Math.abs(monthlySummary.expenseBreakdown[0].total))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: 'success' | 'danger' }) {
  return (
    <div className="rounded-card border border-line bg-app-surface shadow-card p-5 transition-transform duration-150 hover:-translate-y-0.5">
      <p className="eyebrow">{label}</p>
      <div className={`mt-2 font-mono text-2xl font-semibold tnum tracking-tight ${tone === 'success' ? 'text-success' : 'text-danger'}`}>
        {value}
      </div>
    </div>
  );
}
