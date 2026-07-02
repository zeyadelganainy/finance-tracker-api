import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';

export function RegisterPage() {
  const { t } = useTranslation();
  const { signUp, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowVerificationMessage(false);
    try {
      await signUp(email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof Error && err.message === 'VERIFICATION_REQUIRED') {
        setShowVerificationMessage(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create account');
      }
    }
  };

  if (showVerificationMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-base px-4">
        <div className="w-full max-w-md space-y-6 rounded-card border border-line bg-app-surface p-8 shadow-card">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-app-elevated text-success">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl text-ink">{t('auth.verifyTitle')}</h1>
            <p className="mt-2 text-sm text-ink-muted">{t('auth.verifyBody')}</p>
          </div>

          <div className="rounded-md border border-line bg-app-elevated px-4 py-3 text-sm text-ink">
            <p className="mb-1 font-medium">{t('auth.verifyTitle')}</p>
            <p dangerouslySetInnerHTML={{ __html: t('auth.verifyHint', { email }) }} />
          </div>

          <Link
            to="/login"
            className="block w-full rounded-md bg-accent py-2 text-center font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            {t('auth.goToSignIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-base px-4">
      <div className="w-full max-w-md space-y-6 rounded-card border border-line bg-app-surface p-8 shadow-card">
        <div className="text-center">
          <h1 className="font-display text-2xl text-ink">{t('auth.signUp')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('auth.signUpDescription')}</p>
        </div>

        {error && (
          <div className="rounded-md border border-line bg-app-elevated px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-app-surface px-3.5 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line-strong bg-app-surface px-3.5 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-accent py-2 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {isLoading ? t('auth.creating') : t('auth.signUp')}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
