import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-app-elevated text-ink-muted border border-line',
    success: 'bg-app-elevated text-success border border-line',
    warning: 'bg-app-elevated text-warning border border-line',
    danger: 'bg-app-elevated text-danger border border-line',
    info: 'bg-accent-soft text-accent',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
