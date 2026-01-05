import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { CsvImportStep } from './CsvImportStep';

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
  const [activeTab, setActiveTab] = useState<'csv' | 'pdf'>('csv');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Transactions" size="xl">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => setActiveTab('csv')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'csv'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              CSV Import
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pdf'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bank Statement (PDF) <span className="text-xs text-gray-400 ml-1">Coming Soon</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'csv' && (
          <CsvImportStep accountId={accountId} onSuccess={onImportSuccess} onCancel={onClose} />
        )}

        {activeTab === 'pdf' && (
          <div className="py-12 text-center">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">PDF Import Coming Soon</h3>
            <p className="mt-1 text-sm text-gray-500">
              Automatically extract transactions from bank statement PDFs
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
