import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';

interface AdminLoginPageProps {
  onNavigate: (route: string) => void;
}

/**
 * Halaman login admin terpusat (/admin/login).
 *
 * Catatan: halaman ini hanya antarmuka. Verifikasi tetap memakai
 * `verifyPassword` dari AdminContext (endpoint yang sudah ada). Sistem
 * autentikasi baru akan diimplementasikan terpisah oleh developer backend.
 */
export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { isAdmin, isSessionLoading, verifyPassword } = useAdmin();
  const requestedRedirect = new URLSearchParams(window.location.search).get('redirect');
  const redirectPath = requestedRedirect === '/rolling-admin' ? '/rolling-admin' : '/admin';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sesi admin yang sudah valid langsung diarahkan ke panel admin
  useEffect(() => {
    if (isAdmin && !isSessionLoading) {
      onNavigate(redirectPath);
    }
  }, [isAdmin, isSessionLoading, onNavigate, redirectPath]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !password.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await verifyPassword(password);
    setIsSubmitting(false);

    if (res.success) {
      onNavigate(redirectPath);
    } else {
      setErrorMsg(res.error || t.adminLogin.wrongPassword);
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (isSessionLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        {t.adminLogin.checkingSession}
      </div>
    );
  }

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
        {/* Header */}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              placeholder={t.adminLogin.placeholder}
              aria-label={t.adminLogin.passwordLabel}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => onNavigate('/beranda')}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ height: '44px', fontWeight: 600, justifyContent: 'center', minWidth: 0 }}
            >
              <ArrowLeft size={16} />
              <span>{t.adminLogin.backToHome}</span>
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
