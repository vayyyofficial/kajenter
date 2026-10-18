import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDangerous = true,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  const activeTitle = title || t.common.confirmTitle;
  const activeMessage = message || t.common.confirmMessage;
  const activeConfirmLabel = confirmLabel || t.common.yesContinue;
  const activeCancelLabel = cancelLabel || t.common.cancel;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div style={{ textAlign: 'center', padding: '1rem 0.5rem 0.5rem 0.5rem' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: isDangerous ? 'rgba(220, 38, 38, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            color: isDangerous ? 'var(--primary-500)' : 'var(--warning-main, #eab308)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <AlertTriangle size={24} />
        </div>

        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          {activeTitle}
        </h3>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          {activeMessage}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            {activeCancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            {isLoading ? t.common.processing : activeConfirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
