import { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { apiFetch } from '../../lib/apiClient';
import { useToast } from '../ui/Toast';

interface OFXImportStepProps {
  accountId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ImportTransactionRow {
  date: string;
  amount: number;
  description?: string;
  payee?: string;
  memo?: string;
}

interface OFXParseResponse {
  rows: ImportTransactionRow[];
}

interface OFXImportResponse {
  imported: number;
  skipped: number;
  failed: number;
  errors?: Array<{ row: number; message: string }>;
}

export function OFXImportStep({ accountId, onSuccess, onCancel }: OFXImportStepProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportTransactionRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<OFXImportResponse | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'ofx' && fileExt !== 'qfx') {
      showToast('Only .ofx and .qfx files are supported', 'error');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      showToast('File size cannot exceed 10MB', 'error');
      return;
    }

    setFile(selectedFile);
    parseOFXFile(selectedFile);
  };

  const parseOFXFile = async (selectedFile: File) => {
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiFetch<OFXParseResponse>(
        `/accounts/${accountId}/transactions/import/ofx`,
        {
          method: 'POST',
          body: formData,
        }
      );

      setParsedRows(response.rows);
      // Pre-select all rows
      setSelectedRows(new Set(Array.from({ length: response.rows.length }, (_, i) => i)));
      showToast(`Parsed ${response.rows.length} transactions from OFX file`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse OFX file';
      showToast(message, 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleToggleRow = (index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === parsedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: parsedRows.length }, (_, i) => i)));
    }
  };

  const handleRemoveSelected = () => {
    setParsedRows((prev) => prev.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      showToast('No transactions to import', 'error');
      return;
    }

    setImporting(true);
    try {
      const transactions = parsedRows.map((row) => ({
        date: row.date,
        amount: row.amount * -1, // Invert sign for expense
        description: row.description,
        categoryName: undefined,
      }));

      const result = await apiFetch<OFXImportResponse>(
        `/accounts/${accountId}/transactions/import/ofx/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ transactions }),
        }
      );

      setImportSummary(result);
      showToast(
        `Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`,
        result.failed > 0 ? 'warning' : 'success'
      );

      if (result.imported > 0) {
        onSuccess();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      showToast(message, 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!file) {
    return (
      <div className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".ofx,.qfx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-900">Click to upload OFX/QFX file</p>
          <p className="mt-1 text-xs text-gray-500">Supported formats: .ofx, .qfx (max 10MB)</p>
        </div>
      </div>
    );
  }

  if (parsing) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Parsing OFX file...</p>
        </div>
      </div>
    );
  }

  if (importSummary) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Import Complete</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{importSummary.imported}</p>
              <p className="text-sm text-gray-600">Imported</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{importSummary.skipped}</p>
              <p className="text-sm text-gray-600">Skipped (Duplicates)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{importSummary.failed}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>
        </div>

        {importSummary.errors && importSummary.errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h5 className="text-sm font-semibold text-red-900 mb-2">Import Errors</h5>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {importSummary.errors.map((error, idx) => (
                <p key={idx} className="text-xs text-red-700">
                  Row {error.row}: {error.message}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={onCancel}>Done</Button>
        </div>
      </div>
    );
  }

  const rowsToImport = parsedRows.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{parsedRows.length} transactions</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFile(null);
            setParsedRows([]);
            setSelectedRows(new Set());
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        >
          Change File
        </Button>
      </div>

      {/* Preview Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  checked={selectedRows.size === parsedRows.length && parsedRows.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Payee
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parsedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={selectedRows.has(idx)}
                    onChange={() => handleToggleRow(idx)}
                  />
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                <td className="px-6 py-3 text-sm text-gray-900">{row.description || '-'}</td>
                <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-right text-red-600">
                  ${row.amount.toFixed(2)}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{row.payee || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRows.size > 0 && (
        <Button
          variant="outline"
          onClick={handleRemoveSelected}
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          Remove Selected ({selectedRows.size})
        </Button>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={importing}>
          Cancel
        </Button>
        <Button onClick={handleImport} isLoading={importing} disabled={importing || rowsToImport === 0}>
          Import {rowsToImport} Transaction{rowsToImport !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
