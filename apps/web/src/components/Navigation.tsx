import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';

interface NavLink {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: string;
}

const iconClass = 'w-5 h-5 shrink-0';

function useNavLinks(): { primary: NavLink[]; secondary: NavLink[] } {
  const { t } = useTranslation();

  const primary: NavLink[] = [
    {
      to: '/',
      label: t('nav.dashboard'),
      icon: (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      to: '/transactions',
      label: t('nav.transactions'),
      icon: (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      to: '/accounts',
      label: t('nav.accounts'),
      icon: (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      to: '/assets',
      label: t('nav.assets'),
      icon: (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  const secondary: NavLink[] = [
    {
      to: '/categories',
      label: t('nav.categories'),
      icon: (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      to: '/ai',
      label: t('nav.ai'),
      badge: 'Beta',
      icon: (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      to: '/settings',
      label: t('nav.settings'),
      icon: (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 3.924-1.756 4.35 0a1.724 1.724 0 002.591 1.114c1.563-.902 3.542.944 2.64 2.507a1.724 1.724 0 001.114 2.591c1.756.426 1.756 3.924 0 4.35a1.724 1.724 0 00-1.114 2.591c.902 1.563-.944 3.542-2.507 2.64a1.724 1.724 0 00-2.591 1.114c-.426 1.756-3.924 1.756-4.35 0a1.724 1.724 0 00-2.591-1.114c-1.563.902-3.542-.944-2.64-2.507a1.724 1.724 0 00-1.114-2.591c-1.756-.426-1.756-3.924 0-4.35a1.724 1.724 0 001.114-2.591c-.902-1.563.944-3.542 2.507-2.64a1.724 1.724 0 002.591-1.114z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return { primary, secondary };
}

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span
        className="grid h-9 w-9 place-items-center rounded-md text-base font-semibold"
        style={{ backgroundColor: 'var(--accent-color)', color: 'var(--accent-contrast)' }}
      >
        W
      </span>
      <span className="font-display text-xl tracking-tight text-ink">WealthWise</span>
    </Link>
  );
}

function NavItem({ link, isActive, onClick }: { link: NavLink; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      to={link.to}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
        isActive
          ? 'bg-accent-soft text-accent'
          : 'text-ink-muted hover:bg-app-elevated hover:text-ink'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
      )}
      {link.icon}
      <span className="flex-1">{link.label}</span>
      {link.badge && (
        <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-accent">
          {link.badge}
        </span>
      )}
    </Link>
  );
}

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { t } = useTranslation();
  const { primary, secondary } = useNavLinks();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string): boolean =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    navigate('/login');
  };

  const SignOutButton = ({ className }: { className?: string }) => (
    <button
      onClick={handleSignOut}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-app-elevated hover:text-danger',
        className
      )}
    >
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span>{t('nav.signOut', 'Sign Out')}</span>
    </button>
  );

  return (
    <>
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-app-surface md:flex">
        <div className="flex h-16 items-center px-5">
          <Wordmark />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2 scrollbar-subtle">
          {primary.map((link) => (
            <NavItem key={link.to} link={link} isActive={isActive(link.to)} />
          ))}
          <div className="my-3 px-3">
            <div className="h-px bg-line" />
          </div>
          <p className="eyebrow px-3 pb-1">{t('nav.manage', 'Manage')}</p>
          {secondary.map((link) => (
            <NavItem key={link.to} link={link} isActive={isActive(link.to)} />
          ))}
        </nav>
        {user && (
          <div className="border-t border-line p-3">
            <SignOutButton />
          </div>
        )}
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-app-surface/90 px-4 backdrop-blur-md md:hidden">
        <Wordmark />
      </header>

      {/* ---------- Mobile bottom tab bar ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-app-surface/95 backdrop-blur-md md:hidden">
        {primary.map((link) => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.625rem] font-medium transition-colors',
                active ? 'text-accent' : 'text-ink-muted'
              )}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.625rem] font-medium text-ink-muted transition-colors"
        >
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>{t('nav.more', 'More')}</span>
        </button>
      </nav>

      {/* ---------- Mobile "More" sheet ---------- */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-app-surface p-4 pb-8 shadow-pop animate-rise-in">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
            <div className="flex flex-col gap-1">
              {secondary.map((link) => (
                <NavItem key={link.to} link={link} isActive={isActive(link.to)} onClick={() => setMoreOpen(false)} />
              ))}
              {user && (
                <div className="mt-2 border-t border-line pt-2">
                  <SignOutButton />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
