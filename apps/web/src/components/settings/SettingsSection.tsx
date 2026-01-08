import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function SettingsSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6', className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
          {description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </section>
  );
}
