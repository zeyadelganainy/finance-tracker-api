import { useMemo, useState, useEffect } from 'react';
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
          <label className="block text-sm font-medium text-gray-800">
            {label}
            {required ? <span className="text-red-500 ml-0.5">*</span> : null}
          </label>
          {selected ? (
            <span className="text-xs text-gray-500">{selected.type ? selected.type : 'Unspecified'}</span>
          ) : null}
        </div>
      ) : null}

      <div className={`rounded-xl border ${disabled ? 'bg-gray-50' : 'bg-white'} shadow-sm overflow-hidden`}>
        <div className="p-3 border-b bg-gray-50">
          <Input
            type="search"
            placeholder="Search categories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No categories match your search</div>
          ) : (
            options.map((category) => {
              const isActive = category.id === value;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition ${
                    isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-800'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !disabled && onChange(category.id)}
                  disabled={disabled}
                >
                  <span>{category.name}</span>
                  {category.type ? (
                    <span className="text-xs text-gray-500 capitalize">{category.type}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        {onCreateNew ? (
          <div className="p-3 border-t bg-white">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-blue-600 hover:text-blue-700"
              onClick={onCreateNew}
              disabled={disabled}
            >
              + Create new category
            </Button>
          </div>
        ) : null}
      </div>
      {warning ? <p className="text-sm text-amber-600">{warning}</p> : null}
    </div>
  );
}
