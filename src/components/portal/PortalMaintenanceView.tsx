import React, { useState } from 'react';
import { Wrench, ArrowLeft, LogOut, ShieldAlert } from 'lucide-react';
import { PortalLogin } from './PortalLogin';

interface PortalMaintenanceViewProps {
  onBackToHome: () => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export const PortalMaintenanceView: React.FC<PortalMaintenanceViewProps> = ({
  onBackToHome,
  isLoggedIn = false,
  onLogout,
}) => {
  const [showDeveloperLogin, setShowDeveloperLogin] = useState(false);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: showDeveloperLogin ? '460px' : '520px',
        margin: 'auto',
        padding: '2.5rem 1.25rem',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {showDeveloperLogin ? (
        <div style={{ width: '100%' }}>
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--primary-600, #dc2626)',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <ShieldAlert size={13} />
              Akses Khusus Developer
            </span>
          </div>
          <PortalLogin onBackToHome={() => setShowDeveloperLogin(false)} />
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowDeveloperLogin(false)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem' }}
            >
              Kembali ke Layar Maintenance
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl, 20px)',
            padding: 'clamp(1.75rem, 5vw, 2.5rem)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Minimal Outline Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle, rgba(239, 68, 68, 0.08))',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              color: 'var(--primary-600, #dc2626)',
            }}
          >
            <Wrench size={30} strokeWidth={1.8} />
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: '0 0 0.75rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Maintenance
          </h1>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: '0 auto 2rem auto',
              maxWidth: '380px',
              fontWeight: 500,
            }}
          >
            Portal Kelas sedang dalam pemeliharaan.
            <br />
            Silakan kembali lagi nanti.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxWidth: '320px',
              margin: '0 auto',
            }}
          >
            <button
              type="button"
              onClick={onBackToHome}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={16} />
              Kembali ke Website Utama
            </button>

            {isLoggedIn && onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <LogOut size={15} />
                Keluar dari Akun
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeveloperLogin(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.775rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  textDecoration: 'underline',
                  opacity: 0.8,
                  marginTop: '0.5rem',
                }}
              >
                Login Developer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
