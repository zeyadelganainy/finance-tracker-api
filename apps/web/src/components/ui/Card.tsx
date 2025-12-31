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
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow duration-200', className)}>
      {(title || description || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between bg-gray-50/50">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className={cn('text-2xl md:text-3xl font-bold', valueColor || 'text-gray-900')}>
        {value}
      </div>
      {trend && (
        <div className={cn('text-sm mt-2 flex items-center gap-1', trend.positive ? 'text-green-600' : 'text-red-600')}>
          {trend.label === '—' ? (
            <span className="text-gray-500">Not enough history yet</span>
          ) : (
            <>
              {trend.positive ? '↑' : '↓'} {trend.label || `${Math.abs(trend.value)}%`}
            </>
          )}
        </div>
      )}
    </div>
  );
}
