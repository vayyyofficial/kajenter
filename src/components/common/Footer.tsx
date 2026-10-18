import React, { useState, useEffect } from 'react';
import { Mail, Globe, ExternalLink } from 'lucide-react';
import { siInstagram, siTiktok, siDiscord } from 'simple-icons';
import { BRANDING } from '../../config/branding';
import { useAdmin } from '../../context/AdminContext';
import { dataCache } from '../../services/dataCache';
import { SocialMedia } from '../../types';

import { useLanguage } from '../../context/LanguageContext';

interface FooterProps {
  onNavigate?: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { openSecretModal } = useAdmin();
  const [socials, setSocials] = useState<SocialMedia[]>(() => {
    const cached = dataCache.getSocial();
    if (!cached) return [];
    return cached.filter((s) => !s.platform.toLowerCase().includes('youtube'));
  });

  useEffect(() => {
    dataCache.getOrFetchSocial().then((data) => {
      if (data && data.length > 0) {
        setSocials(data.filter((s) => !s.platform.toLowerCase().includes('youtube')));
      }
    });
  }, []);

  // Clean routing paths with dynamic translation
  const navItems = [
    { id: 'beranda', path: '/beranda', label: t.nav.home },
    { id: 'galeri', path: '/galeri', label: t.nav.gallery },
    { id: 'anggota', path: '/anggota', label: t.nav.members },
    { id: 'contact', path: '/contact', label: t.nav.contact },
    { id: 'portal', path: '/portal', label: 'Portal Kelas' },
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

  const renderSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) {
      return (
        <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d={siInstagram.path} />
        </svg>
      );
    }
    if (p.includes('tiktok')) {
      return (
        <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d={siTiktok.path} />
        </svg>
      );
    }
    if (p.includes('discord')) {
      return (
        <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d={siDiscord.path} />
        </svg>
      );
    }
    if (p.includes('email') || p.includes('surat')) {
      return <Mail size={16} />;
    }
    return <Globe size={16} />;
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
        {/* Balanced 3-column Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* 1. Brand Identity */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <img
                src={BRANDING.logoUrl}
                alt={BRANDING.name}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallbackLevel) {
                    target.dataset.fallbackLevel = '1';
                    target.src = BRANDING.fallbackLogoUrl;
                  }
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary-500)',
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.35)',
                  flexShrink: 0,
                }}
              />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
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

            <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)', lineHeight: 1.6, margin: 0, maxWidth: '340px' }}>
              {t.footer.brandDesc}
            </p>
          </div>

          {/* 2. Navigasi Cepat */}
          <div>
            <h4
              style={{
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '1rem',
              }}
            >
              {t.footer.quickNavTitle}
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: 0, margin: 0 }}>
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
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

          {/* 3. Media Sosial & Hubungi Kami */}
          <div>
            <h4
              style={{
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '1rem',
              }}
            >
              {t.footer.socialTitle}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {socials.length > 0 ? (
                socials.slice(0, 4).map((soc) => (
                  <a
                    key={soc.id}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      color: 'var(--gray-300)',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      transition: 'color var(--transition-fast)',
                      padding: '0.2rem 0',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-400)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray-300)')}
                  >
                    <span style={{ color: 'var(--primary-400)', display: 'flex', alignItems: 'center' }}>
                      {renderSocialIcon(soc.platform)}
                    </span>
                    <span>{soc.platform}</span>
                    <ExternalLink size={12} style={{ opacity: 0.6 }} />
                  </a>
                ))
              ) : (
                <>
                  <a
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      color: 'var(--gray-300)',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ color: 'var(--primary-400)' }}>
                      <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d={siInstagram.path} />
                      </svg>
                    </span>
                    <span>Instagram Resmi</span>
                  </a>
                  <a
                    href="https://www.tiktok.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      color: 'var(--gray-300)',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ color: 'var(--primary-400)' }}>
                      <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d={siTiktok.path} />
                      </svg>
                    </span>
                    <span>TikTok Resmi</span>
                  </a>
                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      color: 'var(--gray-300)',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ color: 'var(--primary-400)' }}>
                      <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d={siDiscord.path} />
                      </svg>
                    </span>
                    <span>Tech Lounge Discord</span>
                  </a>
                </>
              )}
            </div>
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

            {/* SECRET ACCESS TRIGGER (Subtle portal button with comfortable touch target) */}
            <button
              onClick={openSecretModal}
              title={t.footer.secretPortalTooltip}
              aria-label={t.footer.secretPortalTooltip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px',
                minHeight: '36px',
                padding: '0 0.4rem',
                margin: '0 0.2rem',
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
                e.currentTarget.style.transform = 'scale(1.2)';
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
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>•</span>
            </button>

            <span>{t.footer.officialPortal}</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
            {t.footer.programSubtitle}
          </div>
        </div>
      </div>
    </footer>
  );
};
