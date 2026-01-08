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
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
            {label}
            {required ? <span className="text-red-500 ml-0.5">*</span> : null}
          </label>
          {selected ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">{selected.type ? selected.type : '—'}</span>
          ) : null}
        </div>
      ) : null}

      <div className={`rounded-xl border ${disabled ? 'bg-gray-50' : 'bg-white dark:bg-gray-900'} shadow-sm overflow-hidden border-gray-200 dark:border-gray-800`}>
        <div className="p-3 border-b bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <Input
            type="search"
            placeholder={t('categories.searchPlaceholder', { defaultValue: 'Search categories' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 dark:text-gray-400">{t('categories.searchEmpty', { defaultValue: 'No categories match your search' })}</div>
          ) : (
            options.map((category) => {
              const isActive = category.id === value;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition ${
                    isActive
                      ? 'bg-[var(--accent-color-soft,rgba(99,102,241,0.12))] text-[var(--accent-color,#4f46e5)] font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !disabled && onChange(category.id)}
                  disabled={disabled}
                >
                  <span>{category.name}</span>
                  {category.type ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{category.type}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        {onCreateNew ? (
          <div className="p-3 border-t bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-[var(--accent-color)] hover:text-[var(--accent-color-hover)]"
              onClick={onCreateNew}
              disabled={disabled}
            >
              + {t('categories.createAction')}
            </Button>
          </div>
        ) : null}
      </div>
      {warning ? <p className="text-sm text-amber-600 dark:text-amber-400">{warning}</p> : null}
    </div>
  );
}
