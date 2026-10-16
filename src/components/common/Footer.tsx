import React from 'react';
import { BRANDING } from '../../config/branding';
import { useAdmin } from '../../context/AdminContext';

interface FooterProps {
  onNavigate?: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { openSecretModal } = useAdmin();

  // Clean routing paths: /beranda, /galeri, /anggota, /contact
  const navItems = [
    { id: 'beranda', path: '/beranda', label: 'Beranda' },
    { id: 'galeri', path: '/galeri', label: 'Galeri' },
    { id: 'anggota', path: '/anggota', label: 'Anggota' },
    { id: 'contact', path: '/contact', label: 'Contact' },
  ];

  const handleNavClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      style={{
        backgroundColor: '#0f172a',
        color: 'var(--gray-300)',
        paddingTop: '3.5rem',
        paddingBottom: '2.5rem',
        borderTop: '3px solid var(--primary-600)',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem',
          }}
        >
          {/* 1. Brand Identity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <img
                src={BRANDING.logoUrl}
                alt={BRANDING.name}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary-500)',
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.35)',
                }}
              />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {BRANDING.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary-400)', fontWeight: 700, display: 'block', marginTop: '0.15rem' }}>
                  {BRANDING.school}
                </span>
                <span style={{ fontSize: '0.725rem', color: 'var(--gray-400)', fontWeight: 500 }}>
                  {BRANDING.program}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)', lineHeight: 1.6, maxWidth: '380px' }}>
              {BRANDING.school}. Dokumentasi kegiatan kejuruan, arsip prestasi, serta direktori resmi guru dan siswa.
            </p>
          </div>

          {/* 2. Navigasi Cepat */}
          <div>
            <h4
              style={{
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1.25rem',
              }}
            >
              Navigasi Cepat
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0 }}>
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.path);
                    }}
                    style={{
                      color: 'var(--gray-300)',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem',
                      transition: 'color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-400)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray-300)')}
                  >
                    <span style={{ color: 'var(--primary-500)', fontSize: '0.75rem' }}>▸</span>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Footer Bottom Bar with Subtle Secret Admin Access         */}
        {/* ========================================================= */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '1.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--gray-400)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span>© 2026 {BRANDING.name}. All rights reserved.</span>

            {/* SECRET ACCESS TRIGGER (Subtle bullet with comfortable touch target) */}
            <button
              onClick={openSecretModal}
              title="Portal"
              aria-label="Akses Sistem Pengelolaan"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                minHeight: '36px',
                padding: '0 0.5rem',
                margin: '0 0.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--gray-600)',
                transition: 'color 0.2s ease, transform 0.2s ease',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary-400)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--gray-600)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onFocus={(e) => {
                e.currentTarget.style.color = 'var(--primary-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.color = 'var(--gray-600)';
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>•</span>
            </button>

            <span>Portal Resmi Kelas.</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
            International Class Program • SMK Telkom Malang
          </div>
        </div>
      </div>
    </footer>
  );
};
