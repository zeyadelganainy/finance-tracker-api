import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function Card({ children, className, title, description, actions }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-app-surface shadow-card overflow-hidden',
        className
      )}
    >
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    positive: boolean;
    label?: string;
  };
  icon?: ReactNode;
  valueColor?: string;
}

export function StatCard({ label, value, trend, icon, valueColor }: StatCardProps) {
  return (
    <div className="rounded-card border border-line bg-app-surface shadow-card p-5 transition-transform duration-150 hover:-translate-y-0.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {icon && <div className="text-ink-faint">{icon}</div>}
      </div>
      <div className={cn('font-mono text-2xl font-semibold tnum tracking-tight md:text-3xl', valueColor || 'text-ink')}>
        {value}
      </div>
      {trend && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-xs tnum',
            trend.positive ? 'text-success' : 'text-danger'
          )}
        >
          {trend.label === '—' ? (
            <span className="text-ink-faint">Not enough history yet</span>
          ) : (
            <>
              {trend.positive ? '▲' : '▼'} {trend.label || `${Math.abs(trend.value)}%`}
            </>
          )}
        </div>
      )}
    </div>
  );
}
