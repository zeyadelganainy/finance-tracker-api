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
          className="cursor-pointer rounded-md border-2 border-dashed border-line-strong p-12 text-center transition-colors hover:border-accent"
        >
          <svg
            className="mx-auto h-12 w-12 text-ink-faint"
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
          <p className="mt-2 text-sm font-medium text-ink">Click to upload OFX/QFX file</p>
          <p className="mt-1 text-xs text-ink-muted">Supported formats: .ofx, .qfx (max 10MB)</p>
        </div>
      </div>
    );
  }

  if (parsing) {
    return (
      <div className="space-y-6">
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-accent"></div>
          <p className="mt-2 text-sm text-ink-muted">Parsing OFX file...</p>
        </div>
      </div>
    );
  }

  if (importSummary) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-line bg-app-elevated p-6">
          <h4 className="mb-4 font-display text-lg text-ink">Import Complete</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-mono text-2xl font-semibold text-success tnum">{importSummary.imported}</p>
              <p className="text-sm text-ink-muted">Imported</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-ink-muted tnum">{importSummary.skipped}</p>
              <p className="text-sm text-ink-muted">Skipped (Duplicates)</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-danger tnum">{importSummary.failed}</p>
              <p className="text-sm text-ink-muted">Failed</p>
            </div>
          </div>
        </div>

        {importSummary.errors && importSummary.errors.length > 0 && (
          <div className="rounded-md border border-line bg-app-elevated p-4">
            <h5 className="mb-2 text-sm font-semibold text-danger">Import Errors</h5>
            <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-subtle">
              {importSummary.errors.map((error, idx) => (
                <p key={idx} className="text-xs text-danger">
                  Row {error.row}: {error.message}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-line pt-4">
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
          <p className="text-sm font-medium text-ink">{file.name}</p>
          <p className="text-xs text-ink-muted">{parsedRows.length} transactions</p>
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
      <div className="overflow-hidden rounded-md border border-line">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line-strong accent-[var(--accent-color)]"
                  checked={selectedRows.size === parsedRows.length && parsedRows.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Date
              </th>
              <th className="px-6 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Description
              </th>
              <th className="px-6 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Payee
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {parsedRows.map((row, idx) => (
              <tr key={idx} className="transition-colors hover:bg-app-elevated">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line-strong accent-[var(--accent-color)]"
                    checked={selectedRows.has(idx)}
                    onChange={() => handleToggleRow(idx)}
                  />
                </td>
                <td className="whitespace-nowrap px-6 py-3 font-mono text-sm text-ink tnum">{row.date}</td>
                <td className="px-6 py-3 text-sm text-ink">{row.description || '-'}</td>
                <td className="whitespace-nowrap px-6 py-3 text-right font-mono text-sm font-semibold text-danger tnum">
                  ${row.amount.toFixed(2)}
                </td>
                <td className="px-6 py-3 text-sm text-ink-muted">{row.payee || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRows.size > 0 && (
        <Button
          variant="ghost"
          onClick={handleRemoveSelected}
          className="text-danger hover:bg-app-elevated"
        >
          Remove Selected ({selectedRows.size})
        </Button>
      )}

      <div className="flex justify-end gap-3 border-t border-line pt-4">
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
