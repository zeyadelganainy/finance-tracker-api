import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Category } from '../../types/api';

export interface CategoryFormValues {
  name: string;
  type?: 'expense' | 'income' | '';
}

interface CategoryFormProps {
  initialValues?: Partial<Category>;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function CategoryForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = 'Save',
}: CategoryFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<CategoryFormValues>({
    name: initialValues?.name || '',
    type: (initialValues?.type as 'expense' | 'income' | undefined) || '',
  });

  useEffect(() => {
    setValues({
      name: initialValues?.name || '',
      type: (initialValues?.type as 'expense' | 'income' | undefined) || '',
    });
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    onSubmit({ name: values.name.trim(), type: values.type || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('categories.name')}
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
        required
        placeholder="e.g., Groceries, Salary"
        autoFocus
      />
      <Select
        label={t('categories.type')}
        value={values.type || ''}
        onChange={(e) => setValues((prev) => ({ ...prev, type: e.target.value as CategoryFormValues['type'] }))}
        options={[
          { value: '', label: t('categories.optionalType') },
          { value: 'expense', label: t('categories.expense') },
          { value: 'income', label: t('categories.income') },
        ]}
      />
      <div className="flex justify-end gap-3 pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {t('common.cancel')}
          </Button>
        ) : null}
        <Button type="submit" isLoading={submitting} disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
