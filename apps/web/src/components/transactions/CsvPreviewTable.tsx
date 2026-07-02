interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  date: string;
  amount: string;
  debit?: string;
  credit?: string;
  category?: string;
  description?: string;
}

interface CsvPreviewTableProps {
  data: ParsedRow[];
  mapping: ColumnMapping;
}

export function CsvPreviewTable({ data, mapping }: CsvPreviewTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-line p-8 text-center">
        <p className="text-sm text-ink-muted">No data to preview</p>
      </div>
    );
  }

  // Get all columns from first row
  const allColumns = Object.keys(data[0]);

  // Highlight mapped columns
  const getMappedColumns = () => {
    const mapped = new Set<string>();
    if (mapping.date) mapped.add(mapping.date);
    if (mapping.amount) mapped.add(mapping.amount);
    if (mapping.debit) mapped.add(mapping.debit);
    if (mapping.credit) mapped.add(mapping.credit);
    if (mapping.category) mapped.add(mapping.category);
    if (mapping.description) mapped.add(mapping.description);
    return mapped;
  };

  const mappedColumns = getMappedColumns();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">Preview (First 20 Rows)</h4>
        <p className="text-xs text-ink-muted">Showing {data.length} of {data.length} rows</p>
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-ink-muted">
                  #
                </th>
                {allColumns.map((col) => (
                  <th
                    key={col}
                    className={`px-4 py-2 text-left text-xs font-semibold uppercase ${
                      mappedColumns.has(col) ? 'bg-accent-soft text-accent' : 'text-ink-muted'
                    }`}
                  >
                    {col}
                    {mappedColumns.has(col) && (
                      <span className="ml-1 inline-block h-2 w-2 rounded-full bg-accent"></span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((row, idx) => (
                <tr key={idx} className="transition-colors hover:bg-app-elevated">
                  <td className="px-4 py-2 font-mono text-xs text-ink-faint">{idx + 1}</td>
                  {allColumns.map((col) => (
                    <td
                      key={col}
                      className={`px-4 py-2 text-xs ${
                        mappedColumns.has(col) ? 'bg-accent-soft font-medium text-ink' : 'text-ink-muted'
                      }`}
                    >
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
