import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast';
import { Navigation } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { AccountsPage } from './pages/AccountsPage';
import { AccountDetailPage } from './pages/AccountDetailPage';
import { AssetsPage } from './pages/AssetsPage';
import { AIPage } from './pages/AIPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AuthProvider } from './auth/AuthProvider';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <main className="min-h-screen bg-app-base text-ink">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<ProtectedLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/accounts" element={<AccountsPage />} />
                    <Route path="/accounts/:id" element={<AccountDetailPage />} />
                    <Route path="/assets" element={<AssetsPage />} />
                    <Route path="/ai" element={<AIPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Routes>
            </main>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-app-base">
      <Navigation />
      {/* Offset for the fixed sidebar (desktop) and bottom tab bar (mobile) */}
      <div className="md:pl-60">
        <div className="min-h-screen pb-20 md:pb-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}


