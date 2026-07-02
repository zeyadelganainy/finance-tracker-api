import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function SettingsSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-card border border-line bg-app-surface shadow-card p-6', className)}>
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
        <div className="max-w-sm">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </section>
  );
}
