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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
          <div className="flex-1 flex items-center justify-center p-12">{about}</div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            {children}
            {mobileAbout ? <div className="mt-6 lg:hidden">{mobileAbout}</div> : null}
          </div>
        </div>
      </div>
      <footer className="py-6 text-center text-xs text-gray-500">Made by Zeyad Elganainy</footer>
    </div>
  );
}
