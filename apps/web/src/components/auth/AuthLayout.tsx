import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  about: ReactNode;
  mobileAbout?: ReactNode;
}

/**
 * Two-column auth layout with optional mobile-friendly about teaser and a subtle footer.
 */
export function AuthLayout({ children, about, mobileAbout }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-app-base">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Brand panel */}
        <div
          className="relative hidden w-1/2 overflow-hidden border-r border-line bg-app-elevated lg:flex"
          style={{
            backgroundImage:
              'radial-gradient(60% 60% at 25% 20%, var(--accent-soft) 0%, transparent 70%)',
          }}
        >
          <div className="flex flex-1 items-center justify-center p-12">{about}</div>
        </div>
        {/* Form panel */}
        <div className="flex w-full items-center justify-center p-6 sm:p-10 lg:w-1/2 lg:p-14">
          <div className="w-full max-w-md">
            {children}
            {mobileAbout ? <div className="mt-6 lg:hidden">{mobileAbout}</div> : null}
          </div>
        </div>
      </div>
      <footer className="py-6 text-center text-xs text-ink-faint">Made by Zeyad Elganainy</footer>
    </div>
  );
}
