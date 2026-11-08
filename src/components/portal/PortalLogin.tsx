import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, ArrowLeft, Globe, Sun, Moon } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { BRANDING } from '../../config/branding';

interface PortalLoginProps {
  onBackToHome: () => void;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({ onBackToHome }) => {
  const { login } = useMemberAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Masukkan email anggota kelas.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Masukkan password Anda.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await login(email.trim(), password.trim());
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Terjadi masalah saat menghubungkan ke server. Silakan coba lagi.');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100%',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--gray-200)',
        }}
      >
        <button
          onClick={onBackToHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--primary-600)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          <span>{t.portal.backToHome}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
            style={{
              padding: '0.25rem 0.55rem',
              borderRadius: '9999px',
              border: '1px solid var(--gray-300)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--gray-700)',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Globe size={12} />
            <span>{language.toUpperCase()}</span>
          </button>

          <button
            onClick={toggleTheme}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '1px solid var(--gray-300)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--gray-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      {/* Hero / Header Section */}
      <div
        style={{
          padding: '2rem 1.5rem 1.5rem 1.5rem',
          textAlign: 'center',
          background: 'radial-gradient(circle at top, var(--primary-50) 0%, transparent 70%)',
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            margin: '0 auto 1rem auto',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--primary-600)',
            padding: '3px',
            backgroundColor: 'var(--white)',
            boxShadow: '0 8px 24px rgba(220, 38, 38, 0.2)',
          }}
        >
          <img
            src={BRANDING.logoUrl}
            alt="Logo Kelas"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        </div>

        <h2
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--gray-900)',
            marginBottom: '0.25rem',
          }}
        >
          {t.portal.loginTitle}
        </h2>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--gray-500)',
            lineHeight: 1.4,
            maxWidth: '320px',
            margin: '0 auto',
          }}
        >
          {t.portal.loginSubtitle}
        </p>
      </div>

      {/* Form Section */}
      <div style={{ padding: '0 1.5rem 2.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              fontSize: '0.825rem',
              lineHeight: 1.4,
              marginBottom: '1.25rem',
              animation: 'shake 0.3s ease',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.775rem',
                fontWeight: 700,
                color: 'var(--gray-700)',
                marginBottom: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Email Anggota Kelas
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: 'var(--gray-400)',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.portal.emailPlaceholder}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--gray-300)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--gray-900)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.775rem',
                fontWeight: 700,
                color: 'var(--gray-700)',
                marginBottom: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Password
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: 'var(--gray-400)',
                }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.portal.passwordPlaceholder}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--gray-300)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--gray-900)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '1.25rem',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              height: '48px',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <LogIn size={18} style={{ flexShrink: 0 }} />
            <span style={{ lineHeight: 1 }}>{loading ? t.portal.loggingIn : t.portal.loginBtn}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
