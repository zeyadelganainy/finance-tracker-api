import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '../../types/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface CategorySelectProps {
  label?: string;
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  onCreateNew?: () => void;
  required?: boolean;
  disabled?: boolean;
  warning?: string | null;
}

/**
 * Searchable category selector that renders human-friendly names only and includes
 * a CTA to create a new category. Keeps the UI decoupled from internal IDs.
 */
export function CategorySelect({
  label,
  categories,
  value,
  onChange,
  onCreateNew,
  required,
  disabled,
  warning,
}: CategorySelectProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [categories.length]);

  const options = useMemo(() => {
    const term = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(term));
  }, [categories, search]);

  const selected = categories.find((c) => c.id === value);

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-ink-muted">
            {label}
            {required ? <span className="ml-0.5 text-danger">*</span> : null}
          </label>
          {selected ? (
            <span className="text-xs capitalize text-ink-faint">{selected.type ? selected.type : '—'}</span>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-line-strong bg-app-surface">
        <div className="border-b border-line p-3">
          <Input
            type="search"
            placeholder={t('categories.searchPlaceholder', { defaultValue: 'Search categories' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="max-h-56 divide-y divide-line overflow-y-auto scrollbar-subtle">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-ink-muted">{t('categories.searchEmpty', { defaultValue: 'No categories match your search' })}</div>
          ) : (
            options.map((category) => {
              const isActive = category.id === value;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-accent-soft font-semibold text-accent'
                      : 'text-ink hover:bg-app-elevated'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  onClick={() => !disabled && onChange(category.id)}
                  disabled={disabled}
                >
                  <span>{category.name}</span>
                  {category.type ? (
                    <span className="text-xs capitalize text-ink-faint">{category.type}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        {onCreateNew ? (
          <div className="border-t border-line p-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-accent hover:text-accent-hover"
              onClick={onCreateNew}
              disabled={disabled}
            >
              + {t('categories.createAction')}
            </Button>
          </div>
        ) : null}
      </div>
      {warning ? <p className="text-sm text-warning">{warning}</p> : null}
    </div>
  );
}
