import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { useCategories } from '../hooks/useCategories';

interface FormData {
  amount: string;
  date: string;
  categoryId: string;
  description: string;
}

export function AddTransactionPage() {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
    categoryId: '',
    description: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function validateForm(): string | null {
    if (!formData.amount || formData.amount === '0') {
      return 'Amount is required and cannot be zero';
    }
    if (!formData.date) {
      return 'Date is required';
    }
    if (!formData.categoryId) {
      return 'Category is required';
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        amount: parseFloat(formData.amount),
        date: formData.date,
        categoryId: parseInt(formData.categoryId),
        description: formData.description.trim() || undefined,
      };

      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Redirect to transactions page on success
      navigate('/transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  }

  if (categoriesLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.spinner}></div>
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <h2 style={styles.errorTitle}>Error</h2>
          <p style={styles.errorMessage}>{categoriesError}</p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <h2 style={styles.errorTitle}>No Categories</h2>
          <p style={styles.errorMessage}>
            You need to create at least one category before adding transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Add Transaction</h1>
        <p style={styles.subtitle}>Record a new income or expense</p>
      </header>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        <div style={styles.formGroup}>
          <label htmlFor="amount" style={styles.label}>
            Amount *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.01"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Enter amount (negative for expense, positive for income)"
            style={styles.input}
            disabled={submitting}
          />
          <p style={styles.hint}>
            Use negative numbers for expenses (e.g., -50.00) and positive for income (e.g., 3000.00)
          </p>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="date" style={styles.label}>
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            style={styles.input}
            disabled={submitting}
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="categoryId" style={styles.label}>
            Category *
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            style={styles.select}
            disabled={submitting}
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="description" style={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add a description (optional)"
            rows={3}
            maxLength={200}
            style={styles.textarea}
            disabled={submitting}
          />
          <p style={styles.hint}>
            {formData.description.length}/200 characters
          </p>
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            style={styles.cancelButton}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '600px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  select: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButton: {
    flex: 1,
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
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
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
};
