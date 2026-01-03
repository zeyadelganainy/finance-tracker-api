import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AboutWealthWise } from '../components/auth/AboutWealthWise';

export function LoginPage() {
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
      <div className="bg-white/90 backdrop-blur shadow-xl border border-gray-100 rounded-2xl p-8 sm:p-10 space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">Welcome</p>
          <h1 className="text-3xl font-bold text-gray-900">Sign in</h1>
          <p className="text-sm text-gray-600">Access your WealthWise dashboard</p>
        </div>

        {info && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg">
            {info}
          </div>
        )}

        {error && (
          <div
            className={`border text-sm px-4 py-3 rounded-lg ${
              error.includes('verified') || error.includes('verify')
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-700'
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
            <label className="block text-sm font-medium text-gray-800">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-800">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {demoEnabled && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemo}
              disabled={isLoading}
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
              title="Sign in with demo account to explore features"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Continue as Demo
            </button>
          </>
        )}

        <div className="space-y-2 text-center text-sm text-gray-600">
          <p>
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-700 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
