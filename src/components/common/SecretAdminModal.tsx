import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';

interface SecretAdminModalProps {
  onSuccessNavigate?: (route: string) => void;
}

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({ onSuccessNavigate }) => {
  const { t } = useLanguage();
  const {
    secretModalOpen,
    closeSecretModal,
    verifyPassword,
  } = useAdmin();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (secretModalOpen) {
      setPassword('');
      setErrorMsg(null);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [secretModalOpen]);

  // Lock background scroll when modal is open and handle ESC key
  useEffect(() => {
    if (secretModalOpen) {
      document.body.classList.add('modal-open');
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSubmitting) {
          closeSecretModal();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [secretModalOpen, isSubmitting, closeSecretModal]);

  if (!secretModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !password.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await verifyPassword(password);
    setIsSubmitting(false);

    if (res.success) {
      closeSecretModal();
      if (onSuccessNavigate) {
        onSuccessNavigate('/admin');
      } else {
        window.history.pushState(null, '', '/admin');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } else {
      setErrorMsg(res.error || t.secretAdmin.wrongPassword);
      setPassword('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        backgroundColor: 'rgba(5, 10, 24, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          closeSecretModal();
        }
      }}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          padding: '2rem 1.75rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon */}
        <button
          onClick={closeSecretModal}
          disabled={isSubmitting}
          aria-label={t.secretAdmin.close}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              border: '2px solid var(--primary-200)',
            }}
          >
            <Lock size={24} />
          </div>

          <h3
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              marginBottom: '0.35rem',
            }}
          >
            {t.secretAdmin.title}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
            {t.secretAdmin.subtitle}
          </p>
        </div>

        {/* Clear Error Notice (No timer/countdown) */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: 'var(--danger-text)',
              fontSize: '0.825rem',
              marginBottom: '1.25rem',
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={16} color="var(--primary-600)" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                placeholder={t.secretAdmin.placeholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="form-input"
                style={{
                  height: '46px',
                  fontSize: '0.95rem',
                  paddingRight: '2.75rem',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  borderColor: errorMsg ? 'var(--primary-500)' : 'var(--border-color)',
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  border: 'none',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Action Buttons: Enter & Cancel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={closeSecretModal}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{
                height: '44px',
                fontWeight: 600,
                justifyContent: 'center',
              }}
            >
              {t.common.cancel}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="btn btn-primary"
              style={{
                height: '44px',
                fontWeight: 700,
                color: '#ffffff',
                justifyContent: 'center',
                opacity: !password.trim() ? 0.6 : 1,
                cursor: !password.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? t.secretAdmin.submitting : t.secretAdmin.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
