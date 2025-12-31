import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiFetch } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { NetWorthHistoryResponse, MonthlySummary, NetWorthDataPoint } from '../types/api';
import { StatCard, Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useAIContext } from '../hooks/useAI';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function DashboardPage() {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showAIContext, setShowAIContext] = useState(false);
  
  // Generate last 6 months for net worth chart
  const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Fetch AI context (used for generating insights later)
  const { data: aiContext, isLoading: loadingAI } = useAIContext();
  
  // Fetch net worth history
  const { data: netWorthData, isLoading: loadingNetWorth } = useQuery({
    queryKey: ['networth', sixMonthsAgo, today],
    queryFn: () => apiFetch<NetWorthHistoryResponse>(`/networth/history?from=${sixMonthsAgo}&to=${today}`),
  });
  
  // Fetch monthly summary
  const { data: monthlySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['summary', selectedMonth],
    queryFn: () => apiFetch<MonthlySummary>(`/summary/monthly?month=${selectedMonth}`),
  });
  
  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy');
    return { value, label };
  });
  
  // Prepare chart data
  const netWorthChartData = netWorthData?.dataPoints.map((point: NetWorthDataPoint) => ({
    date: format(new Date(point.date), 'MMM dd'),
    netWorth: point.netWorth,
  })) || [];
  
  const expenseChartData = monthlySummary?.expenseBreakdown
    .filter(item => Math.abs(item.total) > 0)
    .map(item => ({
      name: item.categoryName,
      value: Math.abs(item.total),
    })) || [];
  
  const latestNetWorth = netWorthData?.dataPoints[netWorthData.dataPoints.length - 1]?.netWorth || 0;
  const previousNetWorth = netWorthData?.dataPoints[netWorthData.dataPoints.length - 2]?.netWorth || 0;
  const netWorthChange = latestNetWorth - previousNetWorth;
  const netWorthChangePercent = previousNetWorth !== 0 
    ? ((netWorthChange / Math.abs(previousNetWorth)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with timestamp */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Overview of your financial health
              </p>
            </div>
            <div className="text-xs text-gray-400">
              Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
        
        {loadingNetWorth || loadingSummary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </>
        ) : (
          <>
            {/* Stats Cards with improved styling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              <StatCard
                label="Net Worth"
                value={formatCurrency(latestNetWorth)}
                trend={{
                  value: parseFloat(netWorthChangePercent),
                  positive: netWorthChange >= 0,
                }}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                valueColor="text-blue-600"
              />
              <StatCard
                label="Monthly Income"
                value={formatCurrency(monthlySummary?.totalIncome || 0)}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                }
                valueColor="text-green-600"
              />
              <StatCard
                label="Monthly Expenses"
                value={formatCurrency(Math.abs(monthlySummary?.totalExpenses || 0))}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                }
                valueColor="text-red-600"
              />
              <StatCard
                label="Net This Month"
                value={formatCurrency(monthlySummary?.net || 0)}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
                valueColor={monthlySummary?.net && monthlySummary.net >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            </div>
            
            {/* Month Selector */}
            <div className="mb-6 max-w-xs">
              <Select
                label="Select Month for Summary"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={monthOptions}
              />
            </div>
            
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Net Worth Over Time */}
              <Card title="Net Worth Over Time" description="Last 6 months">
                <div className="h-80">
                  {netWorthChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={netWorthChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6b7280" 
                          fontSize={12}
                          tick={{ fill: '#6b7280' }}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={12}
                          tick={{ fill: '#6b7280' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Net Worth']}
                        />
                        <Line
                          type="monotone"
                          dataKey="netWorth"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">No net worth data available</p>
                    </div>
                  )}
                </div>
              </Card>
              
              {/* Expense Breakdown */}
              <Card title="Expense Breakdown" description={`By category for ${format(new Date(selectedMonth), 'MMMM yyyy')}`}>
                <div className="h-80">
                  {expenseChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {expenseChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Amount']}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                      <p className="text-sm">No expense data for selected month</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            {/* Top Spending Category */}
            {monthlySummary && monthlySummary.expenseBreakdown.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Top Spending Category
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Highest expense category this month
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {monthlySummary.expenseBreakdown[0].categoryName}
                    </div>
                    <div className="text-lg text-red-600 font-semibold">
                      {formatCurrency(Math.abs(monthlySummary.expenseBreakdown[0].total))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
            
            {/* AI Insights Card (Beta) */}
            <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      AI Insights <span className="text-xs font-medium bg-indigo-200 text-indigo-800 px-2 py-1 rounded">Beta</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Generate personalized financial insights powered by AI analysis
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowAIContext(!showAIContext)}
                  variant="outline"
                  className="flex-shrink-0"
                  isLoading={loadingAI}
                >
                  Generate Insights
                </Button>
              </div>
              
              {/* AI Context Display (for wiring) */}
              {showAIContext && (
                <div className="mt-4 pt-4 border-t border-indigo-200">
                  {loadingAI ? (
                    <div className="text-sm text-gray-600 italic">Loading context...</div>
                  ) : aiContext ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded border border-indigo-100">
                        <p className="text-xs font-semibold text-gray-900 mb-2">Connected Data Summary</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-gray-500">Accounts</p>
                            <p className="font-bold text-gray-900">{aiContext.accounts.totalAccounts}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Assets</p>
                            <p className="font-bold text-gray-900">{aiContext.assets.totalAssets}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Transactions</p>
                            <p className="font-bold text-gray-900">{aiContext.transactions.totalCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Categories</p>
                            <p className="font-bold text-gray-900">{aiContext.categories.totalCategories}</p>
                          </div>
                        </div>
                      </div>
                      
                      <details className="p-3 bg-white rounded border border-indigo-100">
                        <summary className="text-xs font-semibold text-gray-900 cursor-pointer hover:text-indigo-600">
                          View Raw Context Data (Developer View)
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto text-gray-700">
                          {JSON.stringify(aiContext, null, 2)}
                        </pre>
                      </details>
                      
                      <p className="text-xs text-gray-600 italic">
                        💡 Next: Connect to OpenAI or similar LLM to generate insights based on this data.
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 italic">No context data available</div>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
