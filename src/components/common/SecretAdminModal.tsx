import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertCircle, Clock, X, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

interface SecretAdminModalProps {
  onSuccessNavigate?: (route: string) => void;
}

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({ onSuccessNavigate }) => {
  const {
    secretModalOpen,
    closeSecretModal,
    verifyPassword,
    isLocked,
    lockoutRemainingMs,
    attemptsRemaining,
  } = useAdmin();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (secretModalOpen) {
      setPassword('');
      setErrorMsg(null);
      setShowPassword(false);
      setTimeout(() => {
        if (!isLocked) {
          inputRef.current?.focus();
        }
      }, 150);
    }
  }, [secretModalOpen, isLocked]);

  // Lock background scroll when modal open
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

  // Format milliseconds into 11h 42m 15s format
  const formatCountdown = (ms: number): string => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || isSubmitting || !password.trim()) return;

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
      setErrorMsg(res.error || 'Password salah.');
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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
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
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid var(--gray-200)',
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
          aria-label="Tutup Modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            color: 'var(--gray-400)',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: 'var(--radius-sm)',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gray-800)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray-400)')}
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
              backgroundColor: isLocked ? 'var(--primary-100)' : 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              border: '2px solid var(--primary-200)',
            }}
          >
            {isLocked ? <ShieldAlert size={26} color="var(--primary-700)" /> : <Lock size={24} />}
          </div>

          <h3
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--gray-900)',
              letterSpacing: '-0.02em',
              marginBottom: '0.35rem',
            }}
          >
            Enter the Password
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', lineHeight: 1.45 }}>
            {isLocked
              ? 'Sistem terkunci karena batas kesalahan tercapai.'
              : 'Masukkan password verifikasi untuk mengakses panel pengelolaan.'}
          </p>
        </div>

        {/* 12-Hour Lockout State Banner */}
        {isLocked ? (
          <div
            style={{
              backgroundColor: 'var(--primary-50)',
              border: '1.5px solid var(--primary-300)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--primary-700)',
                fontWeight: 700,
                fontSize: '0.9rem',
                marginBottom: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>Too many failed attempts.</span>
            </div>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--primary-900)',
                lineHeight: 1.5,
                marginBottom: '1rem',
              }}
            >
              Admin access has been temporarily locked.
              <br />
              Please try again later.
            </p>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--primary-200)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: 'var(--primary-700)',
                fontWeight: 800,
                fontSize: '0.95rem',
              }}
            >
              <Clock size={16} />
              <span>Try again in: {formatCountdown(lockoutRemainingMs)}</span>
            </div>
          </div>
        ) : (
          /* Normal / Failed Attempt Error Notice */
          errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--primary-50)',
                border: '1px solid var(--primary-200)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                color: 'var(--primary-800)',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={16} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong>{errorMsg}</strong>
                {attemptsRemaining < 3 && attemptsRemaining > 0 && (
                  <div style={{ marginTop: '0.25rem', color: 'var(--primary-700)', fontSize: '0.75rem' }}>
                    Sisa kesempatan: <strong>{attemptsRemaining} kali</strong> sebelum sistem terkunci 12 jam.
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLocked || isSubmitting}
                className="form-input"
                style={{
                  height: '46px',
                  fontSize: '0.95rem',
                  paddingRight: '2.75rem',
                  backgroundColor: isLocked ? 'var(--gray-100)' : '#ffffff',
                  cursor: isLocked ? 'not-allowed' : 'text',
                  borderColor: errorMsg ? 'var(--primary-500)' : 'var(--gray-300)',
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked || isSubmitting}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-400)',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  padding: '0.25rem',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Action Buttons: Enter & Cancel per Requirement #6 */}
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
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLocked || isSubmitting || !password.trim()}
              className="btn btn-primary"
              style={{
                height: '44px',
                fontWeight: 700,
                justifyContent: 'center',
                opacity: isLocked || !password.trim() ? 0.6 : 1,
                cursor: isLocked || !password.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Verifying...' : 'Enter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
