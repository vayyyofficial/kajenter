import React from 'react';
import { LogOut, Globe, Moon, Sun, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { BRANDING } from '../../config/branding';

interface PortalHeaderProps {
  onBackToHome: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({ onBackToHome }) => {
  const { member, logout } = useMemberAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  if (!member) return null;

  const photoSrc = member.photo_number
    ? (member.photo_number.startsWith('http') || member.photo_number.startsWith('/')
        ? member.photo_number
        : `/foto-anggota/${member.photo_number}`)
    : BRANDING.logoUrl;

  const roleName = member.role || (member.member_type === 'guru' ? 'Guru' : 'Siswa');

  return (
    <header
      style={{
        background: 'linear-gradient(135deg, var(--primary-700) 0%, var(--primary-600) 100%)',
        color: '#ffffff',
        padding: '1.25rem 1.25rem 1.75rem 1.25rem',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 8px 24px rgba(220, 38, 38, 0.25)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Top Utility Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <button
          onClick={onBackToHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.35rem 0.75rem',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
          }}
          title={t.portal.backToHome}
        >
          <ArrowLeft size={14} />
          <span>{t.portal.backToHome}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Quick Lang Switch */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.35rem 0.65rem',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Switch Language"
          >
            <Globe size={13} />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
            title="Toggle Dark/Light"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            style={{
              background: 'rgba(0, 0, 0, 0.22)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
            title={t.portal.logout}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Profile Card Snippet (E-Wallet style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <div
          style={{
            position: 'relative',
            width: 52,
            height: 52,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2.5px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            flexShrink: 0,
            backgroundColor: '#ffffff',
          }}
        >
          <img
            src={photoSrc}
            alt={member.full_name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = BRANDING.logoUrl;
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 500 }}>
            {t.brand.name} • SMK Telkom Malang
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.25,
            }}
          >
            {member.nickname || member.full_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.675rem',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <ShieldCheck size={11} />
              {roleName}
            </span>
            {member.attendance_number && (
              <span
                style={{
                  fontSize: '0.675rem',
                  fontWeight: 600,
                  opacity: 0.9,
                }}
              >
                Absen #{member.attendance_number}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
