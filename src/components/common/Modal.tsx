import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: React.CSSProperties;
}

export type PortalModalProps = ModalProps;

/**
 * Architectural Modal Component mounted directly to document.body via React Portal.
 * Solves stacking context, parent overflow/transform traps, and color-leak bugs.
 * Backdrop and Dialog are separate siblings to guarantee the dialog is never blurred or tinted.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  contentStyle = {},
}) => {
  // Lock body scroll reliably and listen for ESC key
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        unlockScroll();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const sizeClasses: Record<string, string> = {
    sm: 'modal-size-sm',
    md: 'modal-size-md',
    lg: 'modal-size-lg',
    xl: 'modal-size-xl',
  };

  return createPortal(
    <div
      className="modal-portal-wrapper"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 1. Neutral Dark Blurred Backdrop */}
      <div
        className="modal-portal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(10, 15, 29, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 1,
          animation: 'fadeIn 220ms ease-out',
        }}
        aria-hidden="true"
      />

      {/* 2. Modal Stage & Container */}
      <div
        className="modal-portal-stage"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1rem, 3vw, 2rem)',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          overflowY: 'auto',
        }}
      >
        <div
          className={`modal-dialog ${sizeClasses[size] || 'modal-size-md'}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl, 20px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'scaleUp 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            ...contentStyle,
          }}
        >
          {title && (
            <div
              className="modal-header"
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--gray-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                flexShrink: 0,
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                className="btn-icon"
                aria-label="Tutup Modal"
                style={{
                  color: 'var(--gray-500)',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div
            className="modal-body"
            style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {children}
          </div>

          {footer && (
            <div
              className="modal-footer"
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--gray-100)',
                backgroundColor: 'var(--gray-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                flexShrink: 0,
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const PortalModal = Modal;
