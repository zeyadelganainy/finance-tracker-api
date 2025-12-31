import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../lib/api';
import { NetWorthHistoryResponse, MonthlySummary, NetWorthDataPoint } from '../types/api';
import { StatCard, Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function DashboardPage() {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  // Generate last 6 months for net worth chart
  const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Fetch net worth history
  const { data: netWorthData, isLoading: loadingNetWorth } = useQuery({
    queryKey: ['networth', sixMonthsAgo, today],
    queryFn: () => api<NetWorthHistoryResponse>(`/networth/history?from=${sixMonthsAgo}&to=${today}`),
  });
  
  // Fetch monthly summary
  const { data: monthlySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['summary', selectedMonth],
    queryFn: () => api<MonthlySummary>(`/summary/monthly?month=${selectedMonth}`),
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
  
  const expenseChartData = monthlySummary?.expenseBreakdown.map(item => ({
    name: item.categoryName,
    value: Math.abs(item.total),
  })) || [];
  
  const latestNetWorth = netWorthData?.dataPoints[netWorthData.dataPoints.length - 1]?.netWorth || 0;
  const previousNetWorth = netWorthData?.dataPoints[netWorthData.dataPoints.length - 2]?.netWorth || 0;
  const netWorthChange = latestNetWorth - previousNetWorth;
  const netWorthChangePercent = previousNetWorth !== 0 
    ? ((netWorthChange / Math.abs(previousNetWorth)) * 100).toFixed(1)
    : '0.0';
  
  const isLoading = loadingNetWorth || loadingSummary;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your financial health
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Net Worth"
              value={`$${latestNetWorth.toFixed(2)}`}
              trend={{
                value: parseFloat(netWorthChangePercent),
                positive: netWorthChange >= 0,
              }}
            />
            <StatCard
              label="Monthly Income"
              value={`$${monthlySummary?.totalIncome.toFixed(2) || '0.00'}`}
            />
            <StatCard
              label="Monthly Expenses"
              value={`$${Math.abs(monthlySummary?.totalExpenses || 0).toFixed(2)}`}
              trend={{
                value: 0,
                positive: false,
              }}
            />
            <StatCard
              label="Net This Month"
              value={`$${monthlySummary?.net.toFixed(2) || '0.00'}`}
            />
          </div>
          
          {/* Month Selector */}
          <div className="mb-6">
            <Select
              label="Select Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={monthOptions}
            />
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Net Worth Over Time */}
            <Card title="Net Worth Over Time">
              <div className="h-80">
                {netWorthChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={netWorthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Net Worth']}
                      />
                      <Line
                        type="monotone"
                        dataKey="netWorth"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No net worth data available
                  </div>
                )}
              </div>
            </Card>
            
            {/* Expense Breakdown */}
            <Card title="Expense Breakdown by Category">
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
                        }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Amount']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No expense data for selected month
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Top Spending Category */}
          {monthlySummary && monthlySummary.expenseBreakdown.length > 0 && (
            <Card className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Top Spending Category</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Highest expense category this month
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {monthlySummary.expenseBreakdown[0].categoryName}
                  </div>
                  <div className="text-lg text-red-600 font-semibold">
                    ${Math.abs(monthlySummary.expenseBreakdown[0].total).toFixed(2)}
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
