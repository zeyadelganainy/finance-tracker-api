import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { api } from '../lib/api';
import { PagedResponse, Transaction } from '../types/api';
import { useCategories } from '../hooks/useCategories';

export function TransactionsPage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter and sort transactions
  useEffect(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.category?.name?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(
        (t) => t.category?.id === parseInt(categoryFilter)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    setFilteredTransactions(filtered);
  }, [searchQuery, categoryFilter, transactions]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      setError(null);

      const data = await api<PagedResponse<Transaction>>('/transactions');
      
      if (data && data.items) {
        setTransactions(data.items);
        setFilteredTransactions(data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  }

  function formatAmount(amount: number): string {
    const isExpense = amount < 0;
    const formatted = Math.abs(amount).toFixed(2);
    return isExpense ? `-$${formatted}` : `$${formatted}`;
  }

  function getAmountColor(amount: number): string {
    return amount < 0 ? '#dc2626' : '#16a34a';
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.spinner}></div>
          <p>Loading transactions...</p>
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
          <button style={styles.retryButton} onClick={fetchTransactions}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Transactions</h1>
          <p style={styles.subtitle}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button 
          style={styles.addButton}
          onClick={() => navigate('/transactions/new')}
        >
          + Add Transaction
        </button>
      </header>

      <div style={styles.filtersContainer}>
        <input
          type="text"
          placeholder="Search by description or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={styles.categorySelect}
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {filteredTransactions.length === 0 ? (
        <div style={styles.emptyState}>
          {transactions.length === 0 ? (
            <>
              <p style={styles.emptyTitle}>No transactions yet</p>
              <p style={styles.emptyText}>
                Get started by adding your first transaction
              </p>
              <button 
                style={styles.emptyButton}
                onClick={() => navigate('/transactions/new')}
              >
                Add Your First Transaction
              </button>
            </>
          ) : (
            <p style={styles.emptyText}>
              {searchQuery || categoryFilter 
                ? 'No transactions match your filters' 
                : 'No transactions found'}
            </p>
          )}
        </div>
      ) : (
        <div style={styles.transactionList}>
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} style={styles.transactionCard}>
              <div style={styles.transactionContent}>
                <div style={styles.transactionMain}>
                  <h3 style={styles.transactionDescription}>
                    {transaction.description || 'No description'}
                  </h3>
                  <div style={styles.transactionMeta}>
                    <span style={styles.transactionDate}>
                      {formatDate(transaction.date)}
                    </span>
                    <span style={styles.transactionCategory}>
                      {transaction.category?.name || 'Uncategorized'}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    ...styles.transactionAmount,
                    color: getAmountColor(transaction.amount),
                  }}
                >
                  {formatAmount(transaction.amount)}
                </div>
              </div>
            </div>
          ))}
        </div>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    gap: '16px',
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
  addButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
  filtersContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 2,
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  categorySelect: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  transactionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    transition: 'box-shadow 0.2s, border-color 0.2s',
    cursor: 'pointer',
  },
  transactionContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  transactionMain: {
    flex: 1,
    minWidth: 0,
  },
  transactionDescription: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  transactionMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '14px',
  },
  transactionDate: {
    color: '#6b7280',
  },
  transactionCategory: {
    color: '#9ca3af',
  },
  transactionAmount: {
    fontSize: '18px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
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
    minHeight: '300px',
    gap: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: '400px',
    margin: 0,
  },
  emptyButton: {
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
