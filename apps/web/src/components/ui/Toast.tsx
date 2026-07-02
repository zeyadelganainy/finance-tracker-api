import { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster, ToastBar } from 'react-hot-toast';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = (message: string, type: ToastType = 'info') => {
    const options = {
      duration: 4000,
      style: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-pop)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.875rem',
      },
    };

    switch (type) {
      case 'success':
        toast.success(message, {
          ...options,
          icon: '✓',
          style: { ...options.style, color: 'var(--success)' },
        });
        break;
      case 'error':
        toast.error(message, {
          ...options,
          icon: '✕',
          style: { ...options.style, color: 'var(--danger)' },
        });
        break;
      case 'warning':
        toast(message, {
          ...options,
          icon: '⚠',
          style: { ...options.style, color: 'var(--warning)' },
        });
        break;
      default:
        toast(message, {
          ...options,
          icon: 'ℹ',
          style: { ...options.style, color: 'var(--accent-color)' },
        });
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'font-medium text-sm',
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="ml-2 hover:opacity-70 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
