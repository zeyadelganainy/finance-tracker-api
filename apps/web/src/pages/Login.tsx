import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AboutWealthWise } from '../components/auth/AboutWealthWise';

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn, signInAsDemo, isLoading, demoEnabled } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check for session expiry message
  useEffect(() => {
    const message = sessionStorage.getItem('auth_redirect_message');
    if (message) {
      setInfo(message);
      sessionStorage.removeItem('auth_redirect_message');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
    }
  };

  const handleDemo = async () => {
    setError(null);
    try {
      await signInAsDemo();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in as demo');
    }
  };

  return (
    <AuthLayout
      about={<AboutWealthWise />}
      mobileAbout={<AboutWealthWise variant="mobile" />}
    >
      <div className="rounded-card border border-line bg-app-surface p-8 shadow-card sm:p-10 space-y-8">
        <div className="space-y-2 text-center">
          <p className="eyebrow">{t('auth.welcome')}</p>
          <h1 className="font-display text-3xl text-ink">{t('auth.signIn')}</h1>
          <p className="text-sm text-ink-muted">{t('auth.signInDescription')}</p>
        </div>

        {info && (
          <div className="rounded-md border border-line bg-app-elevated px-4 py-3 text-sm text-ink">
            {info}
          </div>
        )}

        {error && (
          <div
            className={`rounded-md border border-line bg-app-elevated px-4 py-3 text-sm ${
              error.includes('verified') || error.includes('verify') ? 'text-warning' : 'text-danger'
            }`}
          >
            {error.includes('verified') || error.includes('verify') ? (
              <>
                <p className="font-medium mb-1">Email Verification Required</p>
                <p>{error}</p>
              </>
            ) : (
              error
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-muted">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-app-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-muted">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-app-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-accent py-2.5 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface disabled:opacity-50"
          >
            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        {demoEnabled && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-app-surface px-2 text-ink-faint">{t('auth.or')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemo}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-line-strong py-2.5 font-semibold text-ink transition-colors hover:bg-app-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface disabled:opacity-50"
              title={t('auth.demoHint')}
            >
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('auth.continueDemo')}
            </button>
          </>
        )}

        <div className="space-y-2 text-center text-sm text-ink-muted">
          <p>
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              {t('auth.createOne')}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
