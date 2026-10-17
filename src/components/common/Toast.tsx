import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 100010,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '400px',
        width: 'calc(100% - 3rem)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const borderColor = isSuccess ? 'var(--success-border)' : isError ? 'var(--danger-border)' : isWarning ? 'var(--warning-border)' : 'var(--info-border)';
        const iconColor = isSuccess ? 'var(--success-main)' : isError ? 'var(--danger-main)' : isWarning ? 'var(--warning-main)' : 'var(--info-main)';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: '#ffffff',
              border: `1px solid ${borderColor}`,
              borderLeft: `5px solid ${iconColor}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              animation: 'slideUp 200ms ease-out',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px', color: iconColor }}>
              {isSuccess && <CheckCircle2 size={18} />}
              {isError && <AlertCircle size={18} />}
              {isWarning && <AlertTriangle size={18} />}
              {!isSuccess && !isError && !isWarning && <Info size={18} />}
            </div>

            <div style={{ flex: 1 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)', marginBottom: '0.15rem' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', lineHeight: 1.4 }}>
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                color: 'var(--gray-400)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: '0.2rem',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
