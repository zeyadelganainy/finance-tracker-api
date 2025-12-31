import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { PagedResponse, Transaction } from '../types/api';

interface DashboardStats {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategory: {
    name: string;
    total: number;
  } | null;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    topCategory: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch all transactions to calculate stats
      const data = await api<PagedResponse<Transaction>>('/transactions?pageSize=1000');
      
      if (data && data.items) {
        const transactions = data.items;
        
        // Calculate totals
        const totalIncome = transactions
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalExpenses = transactions
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        const balance = totalIncome - totalExpenses;

        // Find top spending category
        const categoryTotals = new Map<string, number>();
        transactions
          .filter(t => t.amount < 0 && t.category)
          .forEach(t => {
            const category = t.category!.name;
            const current = categoryTotals.get(category) || 0;
            categoryTotals.set(category, current + Math.abs(t.amount));
          });

        let topCategory = null;
        if (categoryTotals.size > 0) {
          const [name, total] = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])[0];
          topCategory = { name, total };
        }

        setStats({
          totalTransactions: transactions.length,
          totalIncome,
          totalExpenses,
          balance,
          topCategory,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <h2 style={styles.errorTitle}>Error</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button style={styles.retryButton} onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>Your financial overview</p>
      </header>

      {stats.totalTransactions === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>Welcome to Finance Tracker</p>
          <p style={styles.emptyText}>
            Get started by adding your first transaction to see your financial overview
          </p>
          <button 
            style={styles.addButton}
            onClick={() => navigate('/transactions/new')}
          >
            Add Your First Transaction
          </button>
        </div>
      ) : (
        <>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Transactions</div>
              <div style={styles.statValue}>{stats.totalTransactions}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Income</div>
              <div style={{ ...styles.statValue, color: '#16a34a' }}>
                {formatCurrency(stats.totalIncome)}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Expenses</div>
              <div style={{ ...styles.statValue, color: '#dc2626' }}>
                {formatCurrency(stats.totalExpenses)}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Balance</div>
              <div 
                style={{
                  ...styles.statValue,
                  color: stats.balance >= 0 ? '#16a34a' : '#dc2626'
                }}
              >
                {formatCurrency(stats.balance)}
              </div>
            </div>
          </div>

          {stats.topCategory && (
            <div style={styles.topCategoryCard}>
              <h2 style={styles.topCategoryTitle}>Top Spending Category</h2>
              <div style={styles.topCategoryContent}>
                <span style={styles.topCategoryName}>{stats.topCategory.name}</span>
                <span style={styles.topCategoryAmount}>
                  {formatCurrency(stats.topCategory.total)}
                </span>
              </div>
            </div>
          )}

          <div style={styles.actionsCard}>
            <h2 style={styles.actionsTitle}>Quick Actions</h2>
            <div style={styles.actions}>
              <button 
                style={styles.actionButton}
                onClick={() => navigate('/transactions/new')}
              >
                Add Transaction
              </button>
              <button 
                style={styles.actionButton}
                onClick={() => navigate('/transactions')}
              >
                View All Transactions
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
  },
  topCategoryCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  topCategoryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  topCategoryContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topCategoryName: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
  },
  topCategoryAmount: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#dc2626',
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
  },
  actionsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#dc2626',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#6b7280',
    maxWidth: '500px',
  },
  retryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    maxWidth: '500px',
  },
  addButton: {
    marginTop: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
