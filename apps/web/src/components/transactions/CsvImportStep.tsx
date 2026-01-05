import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '../ui/Button';
import { CsvColumnMapper } from './CsvColumnMapper';
import { CsvPreviewTable } from './CsvPreviewTable';
import { apiFetch } from '../../lib/apiClient';
import { useToast } from '../ui/Toast';

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

interface ImportSummary {
  imported: number;
  skipped: number;
  failed: number;
  errors?: Array<{ row: number; message: string }>;
}

interface CsvImportStepProps {
  accountId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CsvImportStep({ accountId, onSuccess, onCancel }: CsvImportStepProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    amount: '',
    debit: '',
    credit: '',
    category: '',
    description: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportSummary(null);
    setValidationErrors([]);

    Papa.parse<ParsedRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          showToast('CSV file is empty', 'error');
          return;
        }

        const cols = results.meta.fields || [];
        setColumns(cols);
        setParsedData(results.data);

        // Auto-detect columns
        const detectedMapping = autoDetectColumns(cols);
        setMapping(detectedMapping);
      },
      error: (error) => {
        showToast(`Failed to parse CSV: ${error.message}`, 'error');
      },
    });
  };

  const autoDetectColumns = (cols: string[]): ColumnMapping => {
    const lower = cols.map((c) => c.toLowerCase());
    
    // Date detection
    const dateIdx = lower.findIndex((c) =>
      ['date', 'transaction date', 'posted date', 'trans date', 'posting date'].includes(c)
    );
    
    // Amount detection
    const amountIdx = lower.findIndex((c) => ['amount', 'transaction amount'].includes(c));
    
    // Debit/Credit detection
    const debitIdx = lower.findIndex((c) => ['debit', 'withdrawal', 'withdrawals'].includes(c));
    const creditIdx = lower.findIndex((c) => ['credit', 'deposit', 'deposits'].includes(c));
    
    // Category detection
    const categoryIdx = lower.findIndex((c) => ['category', 'type', 'transaction type'].includes(c));
    
    // Description detection
    const descriptionIdx = lower.findIndex((c) =>
      ['description', 'memo', 'details', 'merchant', 'name', 'payee'].includes(c)
    );

    return {
      date: dateIdx >= 0 ? cols[dateIdx] : '',
      amount: amountIdx >= 0 ? cols[amountIdx] : '',
      debit: debitIdx >= 0 ? cols[debitIdx] : '',
      credit: creditIdx >= 0 ? cols[creditIdx] : '',
      category: categoryIdx >= 0 ? cols[categoryIdx] : '',
      description: descriptionIdx >= 0 ? cols[descriptionIdx] : '',
    };
  };

  const validateMapping = (): string[] => {
    const errors: string[] = [];

    if (!mapping.date) {
      errors.push('Date column is required');
    }

    if (!mapping.amount && !mapping.debit && !mapping.credit) {
      errors.push('Amount column (or Debit/Credit columns) is required');
    }

    // Validate sample data
    if (parsedData.length > 0 && mapping.date) {
      const sampleDate = parsedData[0][mapping.date];
      if (!isValidDate(sampleDate)) {
        errors.push(`Date column contains invalid date format: "${sampleDate}"`);
      }
    }

    if (parsedData.length > 0 && mapping.amount) {
      const sampleAmount = parsedData[0][mapping.amount];
      if (!isValidNumber(sampleAmount)) {
        errors.push(`Amount column contains non-numeric value: "${sampleAmount}"`);
      }
    }

    return errors;
  };

  const isValidDate = (value: string): boolean => {
    if (!value) return false;
    
    // Try parsing M/D/YYYY format (8/27/2025)
    const parts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
      const [, month, day, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return !isNaN(date.getTime());
    }
    
    // Fallback to standard parsing
    const date = new Date(value);
    return !isNaN(date.getTime());
  };

  const isValidNumber = (value: string): boolean => {
    if (!value) return false;
    const cleaned = value.replace(/[$,\s]/g, '');
    return !isNaN(parseFloat(cleaned));
  };

  const handleImport = async () => {
    const errors = validateMapping();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setImporting(true);
    setValidationErrors([]);

    try {
      // Transform CSV rows to transaction DTOs
      const transactions: any[] = [];
      const rowErrors: Array<{ row: number; message: string }> = [];
      
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const dateStr = row[mapping.date];
        
        // Skip completely empty rows
        if (!dateStr || !dateStr.trim()) {
          continue;
        }
        
        // Parse date - try multiple formats
        let dateIso: string | null = null;
        
        // Try M/D/YYYY format (8/27/2025)
        let parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (parts) {
          const [, monthStr, dayStr, yearStr] = parts;
          const month = parseInt(monthStr);
          const day = parseInt(dayStr);
          const year = parseInt(yearStr);
          
          // Validate month/day ranges
          if (month < 1 || month > 12 || day < 1 || day > 31) {
            rowErrors.push({ row: i + 1, message: `Invalid date: ${dateStr}` });
            continue;
          }
          
          // Create date without timezone issues
          dateIso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else {
          // Try D-MMM format (24-Sep)
          parts = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})$/);
          if (parts) {
            const [, dayStr, monthStr] = parts;
            const months: { [key: string]: string } = {
              'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
              'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
            };
            const monthNum = months[monthStr.toLowerCase()];
            if (!monthNum) {
              rowErrors.push({ row: i + 1, message: `Invalid month: ${monthStr}` });
              continue;
            }
            const day = parseInt(dayStr);
            if (day < 1 || day > 31) {
              rowErrors.push({ row: i + 1, message: `Invalid day: ${dayStr}` });
              continue;
            }
            // Use current year as fallback
            const year = new Date().getFullYear();
            dateIso = `${year}-${monthNum}-${day.toString().padStart(2, '0')}`;
          } else {
            // Skip rows that don't match expected date formats (e.g., "TOTAL EXPENSES")
            continue;
          }
        }
        
        // Parse amount
        let amount = 0;
        if (mapping.amount) {
          const amountStr = row[mapping.amount]?.replace(/[$,\s]/g, '') || '';
          if (!amountStr || isNaN(parseFloat(amountStr))) {
            continue; // Skip rows with missing/invalid amounts
          }
          amount = parseFloat(amountStr);
        } else if (mapping.debit && mapping.credit) {
          const debitStr = row[mapping.debit]?.replace(/[$,\s]/g, '') || '0';
          const creditStr = row[mapping.credit]?.replace(/[$,\s]/g, '') || '0';
          const debit = parseFloat(debitStr) || 0;
          const credit = parseFloat(creditStr) || 0;
          amount = credit - debit; // Credit is positive, debit is negative
        } else {
          continue; // Skip if no amount column
        }
        
        if (amount === 0) {
          continue; // Skip zero-amount rows
        }

        transactions.push({
          date: dateIso,
          amount,
          description: mapping.description ? row[mapping.description]?.trim() : undefined,
          categoryName: mapping.category ? row[mapping.category]?.trim() : undefined,
        });
      }

      const payload = {
        accountId,
        transactions,
      };

      // Check for validation errors during transformation
      if (rowErrors.length > 0) {
        setValidationErrors(rowErrors.map(e => `Row ${e.row}: ${e.message}`));
        return;
      }

      // Check if we have any transactions after filtering
      if (transactions.length === 0) {
        setValidationErrors(['No valid transactions found in CSV after filtering empty rows and summary rows']);
        return;
      }

      const result = await apiFetch<ImportSummary>(`/accounts/${accountId}/transactions/import`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

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

  const previewData = parsedData.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* File Upload */}
      {!file && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
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
            <p className="mt-2 text-sm font-medium text-gray-900">Click to upload CSV file</p>
            <p className="mt-1 text-xs text-gray-500">or drag and drop</p>
          </div>
        </div>
      )}

      {/* Column Mapping & Preview */}
      {file && !importSummary && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{parsedData.length} rows</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setParsedData([]);
                setColumns([]);
                setMapping({ date: '', amount: '', debit: '', credit: '', category: '', description: '' });
                setValidationErrors([]);
              }}
            >
              Change File
            </Button>
          </div>

          <CsvColumnMapper
            columns={columns}
            mapping={mapping}
            onMappingChange={setMapping}
          />

          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Validation Errors</h4>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CsvPreviewTable data={previewData} mapping={mapping} />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleImport} isLoading={importing} disabled={importing}>
              Import {parsedData.length} Transaction{parsedData.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </>
      )}

      {/* Import Summary */}
      {importSummary && (
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
      )}
    </div>
  );
}
