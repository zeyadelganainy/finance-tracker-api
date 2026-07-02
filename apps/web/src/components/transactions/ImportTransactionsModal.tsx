import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { CsvImportStep } from './CsvImportStep';
import { OFXImportStep } from './OFXImportStep';

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onImportSuccess: () => void;
}

export function ImportTransactionsModal({
  isOpen,
  onClose,
  accountId,
  onImportSuccess,
}: ImportTransactionsModalProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'ofx' | 'pdf'>('csv');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Transactions" size="xl">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="border-b border-line">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('csv')}
              className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'csv'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              CSV Import
            </button>
            <button
              onClick={() => setActiveTab('ofx')}
              className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'ofx'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              OFX/QFX Import
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'pdf'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Bank Statement (PDF) <span className="ml-1 text-xs text-ink-faint">Coming Soon</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'csv' && (
          <CsvImportStep accountId={accountId} onSuccess={onImportSuccess} onCancel={onClose} />
        )}

        {activeTab === 'ofx' && (
          <OFXImportStep accountId={accountId} onSuccess={onImportSuccess} onCancel={onClose} />
        )}

        {activeTab === 'pdf' && (
          <div className="py-12 text-center">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-ink">PDF Import Coming Soon</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Automatically extract transactions from bank statement PDFs
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
