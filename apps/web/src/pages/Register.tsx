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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-md rounded-xl p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t('auth.verifyTitle')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t('auth.verifyBody')}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700 text-blue-800 dark:text-blue-200 text-sm px-4 py-3 rounded-lg">
            <p className="font-medium mb-1">{t('auth.verifyTitle')}</p>
            <p dangerouslySetInnerHTML={{ __html: t('auth.verifyHint', { email }) }} />
          </div>

          <Link 
            to="/login"
            className="block w-full bg-[var(--accent-color,#4f46e5)] text-white py-2 rounded-lg font-semibold hover:bg-[var(--accent-color-hover,#4338ca)] transition text-center"
          >
            {t('auth.goToSignIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-md rounded-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t('auth.signUp')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('auth.signUpDescription')}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color,#4f46e5)] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color,#4f46e5)] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--accent-color,#4f46e5)] text-white py-2 rounded-lg font-semibold hover:bg-[var(--accent-color-hover,#4338ca)] transition disabled:opacity-50"
          >
            {isLoading ? t('auth.creating') : t('auth.signUp')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
