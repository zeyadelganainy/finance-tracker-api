import { Select } from '../ui/Select';

interface ColumnMapping {
  date: string;
  amount: string;
  debit?: string;
  credit?: string;
  category?: string;
  description?: string;
}

interface CsvColumnMapperProps {
  columns: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

export function CsvColumnMapper({ columns, mapping, onMappingChange }: CsvColumnMapperProps) {
  const columnOptions = [
    { value: '', label: '-- Not mapped --' },
    ...columns.map((col) => ({ value: col, label: col })),
  ];

  const updateMapping = (key: keyof ColumnMapping, value: string) => {
    onMappingChange({ ...mapping, [key]: value });
  };

  return (
    <div className="space-y-4 rounded-md border border-line bg-app-elevated p-4">
      <h4 className="text-sm font-semibold text-ink">Column Mapping</h4>
      <p className="text-xs text-ink-muted">
        Map CSV columns to transaction fields. Required fields are marked with *
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Date Column *"
          value={mapping.date}
          onChange={(e) => updateMapping('date', e.target.value)}
          options={columnOptions}
        />

        <Select
          label="Amount Column *"
          value={mapping.amount}
          onChange={(e) => updateMapping('amount', e.target.value)}
          options={columnOptions}
        />

        <Select
          label="Debit Column (optional)"
          value={mapping.debit || ''}
          onChange={(e) => updateMapping('debit', e.target.value)}
          options={columnOptions}
        />

        <Select
          label="Credit Column (optional)"
          value={mapping.credit || ''}
          onChange={(e) => updateMapping('credit', e.target.value)}
          options={columnOptions}
        />

        <Select
          label="Category Column (optional)"
          value={mapping.category || ''}
          onChange={(e) => updateMapping('category', e.target.value)}
          options={columnOptions}
        />

        <Select
          label="Description Column (optional)"
          value={mapping.description || ''}
          onChange={(e) => updateMapping('description', e.target.value)}
          options={columnOptions}
        />
      </div>

      <div className="rounded border border-line bg-app-surface p-3 text-xs text-ink-muted">
        <strong className="text-ink">Tip:</strong> If your CSV has separate Debit and Credit columns instead of a single
        Amount column, map both. Credits will be positive and debits will be negative.
      </div>
    </div>
  );
}
