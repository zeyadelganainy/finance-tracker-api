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
      <div className="rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No data to preview</p>
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
        <h4 className="text-sm font-semibold text-gray-900">Preview (First 20 Rows)</h4>
        <p className="text-xs text-gray-500">Showing {data.length} of {data.length} rows</p>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                  #
                </th>
                {allColumns.map((col) => (
                  <th
                    key={col}
                    className={`px-4 py-2 text-left text-xs font-semibold uppercase ${
                      mappedColumns.has(col)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {col}
                    {mappedColumns.has(col) && (
                      <span className="ml-1 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500">{idx + 1}</td>
                  {allColumns.map((col) => (
                    <td
                      key={col}
                      className={`px-4 py-2 text-xs ${
                        mappedColumns.has(col)
                          ? 'font-medium text-gray-900 bg-blue-50'
                          : 'text-gray-700'
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
