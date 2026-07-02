import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-ink">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-app-elevated text-ink-faint">
          {icon}
        </div>
      )}
      <h3 className="mb-2 font-display text-lg text-ink">{title}</h3>
      {description && (
        <p className="mb-6 max-w-md text-center text-sm text-ink-muted">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
