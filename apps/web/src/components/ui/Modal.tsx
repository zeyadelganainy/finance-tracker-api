import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={`relative ${sizes[size]} flex max-h-[90vh] w-full flex-col rounded-card border border-line bg-app-surface shadow-pop animate-rise-in`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-lg text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="text-ink-faint transition-colors hover:text-ink"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 text-ink scrollbar-subtle">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isProcessing?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isProcessing = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    if (isProcessing) return; // Guard against double-fire (e.g., rapid double-click or StrictMode re-renders)
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-app-elevated hover:text-ink"
            disabled={isProcessing}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              variant === 'danger'
                ? 'bg-danger text-white hover:opacity-90'
                : 'bg-accent text-accent-contrast hover:bg-accent-hover'
            }`}
            disabled={isProcessing}
          >
            {isProcessing ? 'Working...' : confirmText}
          </button>
        </>
      }
    >
      <p className="text-ink-muted">{message}</p>
    </Modal>
  );
}
