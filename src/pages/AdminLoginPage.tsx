import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';

interface AdminLoginPageProps {
  onNavigate: (route: string) => void;
  successPath?: string;
}

function resolveSuccessPath(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window === 'undefined') return '/admin';
  const requestedRedirect = new URLSearchParams(window.location.search).get('redirect');
  const path = window.location.pathname.toLowerCase();
  if (
    requestedRedirect === '/rolling-admin' ||
    requestedRedirect === '/admin/rolling' ||
    path.includes('rolling')
  ) {
    return '/admin/rolling';
  }
  return '/admin';
}

/**
 * Enter Password gate for `/admin`.
 *
 * Verification uses the backend endpoint through AdminContext.
 * The resulting token lives in memory only for this tab session.
 */
export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onNavigate,
  successPath,
}) => {
  const { t } = useLanguage();
  const { isAdmin, verifyPassword, isLocked, lockoutRemainingMs, refreshLockoutStatus } = useAdmin();
  const redirectPath = resolveSuccessPath(successPath);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdmin) {
      onNavigate(redirectPath);
    }
  }, [isAdmin, onNavigate, redirectPath]);

  useEffect(() => {
    inputRef.current?.focus();
    void refreshLockoutStatus();
  }, [refreshLockoutStatus]);

  useEffect(() => {
    setLockoutSeconds(Math.ceil(lockoutRemainingMs / 1000));
  }, [lockoutRemainingMs]);

  useEffect(() => {
    if (!isLocked || lockoutSeconds <= 0) return;
    const timer = window.setInterval(() => setLockoutSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [isLocked, lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLocked || !password.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await verifyPassword(password);
    setIsSubmitting(false);

    if (res.success) {
      onNavigate(redirectPath);
    } else {
      const suffix = !res.locked && res.attemptsLeft !== undefined ? ` Sisa percobaan: ${res.attemptsLeft}.` : '';
      setErrorMsg((res.error || t.adminLogin.wrongPassword) + suffix);
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'max(520px, 68vh)',
        padding: '2.5rem 0 3rem 0',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          padding: '2rem 1.75rem',
        }}
      >
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

          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              marginBottom: '0.35rem',
            }}
          >
            {t.adminLogin.title}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
            {t.adminLogin.subtitle}
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
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

        {isLocked && (
          <p role="status" style={{ color: 'var(--danger-text)', fontSize: '0.85rem', margin: '0 0 1rem', textAlign: 'center' }}>
            Login dikunci. Coba lagi dalam {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')}.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              placeholder={t.adminLogin.placeholder}
              aria-label={t.adminLogin.passwordLabel}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || isLocked}
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
              disabled={isSubmitting || isLocked}
              aria-label={showPassword ? t.adminLogin.hidePassword : t.adminLogin.showPassword}
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

          <div
            className="admin-login-actions"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}
          >
            <button
              type="button"
              onClick={() => onNavigate('/beranda')}
              disabled={isSubmitting || isLocked}
              className="btn btn-secondary"
              style={{ height: '44px', fontWeight: 600, justifyContent: 'center', minWidth: 0 }}
            >
              <ArrowLeft size={16} />
              <span>{t.adminLogin.backToHome}</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isLocked || !password.trim()}
              className="btn btn-primary"
              style={{
                height: '44px',
                fontWeight: 700,
                color: '#ffffff',
                justifyContent: 'center',
                minWidth: 0,
                opacity: !password.trim() ? 0.6 : 1,
                cursor: !password.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? t.adminLogin.submitting : t.adminLogin.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
