import React, { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  Mail,
  Globe,
  Sparkles,
} from 'lucide-react';
import { siInstagram, siTiktok, siDiscord } from 'simple-icons';
import type { SocialMedia } from '../types';
import { dataCache } from '../services/dataCache';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Skeleton } from '../components/common/Skeleton';
import { useRealtimeSync } from '../context/SyncContext';
import { useLanguage } from '../context/LanguageContext';

interface ContactPageProps {
  onNavigate: (route: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = () => {
  const { t } = useLanguage();
  const cached = dataCache.getSocial();
  const [socials, setSocials] = useState<SocialMedia[]>(() => {
    if (!cached) return [];
    return cached.filter((s) => !s.platform.toLowerCase().includes('youtube'));
  });
  const [loading, setLoading] = useState(!cached);

  const fetchSocials = useCallback(async () => {
    try {
      const c = dataCache.getSocial();
      if (!c) setLoading(true);
      const data = await dataCache.getOrFetchSocial(true);
      const activeOnly = data.filter(
        (s) => !s.platform.toLowerCase().includes('youtube')
      );
      setSocials(activeOnly);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch from shared persistent database
  useEffect(() => {
    fetchSocials();
  }, [fetchSocials]);

  // Real-time synchronization: automatically updates when admin modifies socials
  useRealtimeSync(['social'], () => {
    fetchSocials();
  });

  // Authentic Simple Icons in brand red (var(--primary-600)) on white background
  const renderBrandIcon = (platform: string) => {
    const p = platform.toLowerCase();

    let iconData = null;
    if (p.includes('instagram')) {
      iconData = siInstagram;
    } else if (p.includes('tiktok')) {
      iconData = siTiktok;
    } else if (p.includes('discord')) {
      iconData = siDiscord;
    }

    if (iconData) {
      return (
        <svg
          role="img"
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="currentColor"
          style={{ color: 'var(--primary-500)', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>{iconData.title}</title>
          <path d={iconData.path} />
        </svg>
      );
    }

    if (p.includes('email') || p.includes('surat')) {
      return <Mail size={24} color="var(--primary-500)" />;
    }

    return <Globe size={24} color="var(--primary-500)" />;
  };

  const getPlatformSubtitle = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return t.contact.instagramSubtitle;
    if (p.includes('tiktok')) return t.contact.tiktokSubtitle;
    if (p.includes('discord')) return t.contact.discordSubtitle;
    return t.contact.defaultSubtitle;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div className="section-header" style={{ textAlign: 'center' }}>
        <div className="section-tag" style={{ margin: '0 auto 1rem auto' }}>
          <Sparkles size={14} />
          <span>{t.contact.pageTag}</span>
        </div>
        <h1 className="section-title">{t.contact.pageTitle}</h1>
        <p className="section-subtitle" style={{ margin: '0 auto', maxWidth: '640px' }}>
          {t.contact.pageSubtitle}
        </p>
      </div>

      {/* Requirements #7, #8: Symmetrical, consistent 3-column cards for Instagram, TikTok, and Discord */}
      {loading && socials.length === 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            width: '100%',
          }}
        >
          <div className="card" style={{ padding: '2rem', height: '140px' }}><Skeleton height="50px" width="70%" /></div>
          <div className="card" style={{ padding: '2rem', height: '140px' }}><Skeleton height="50px" width="70%" /></div>
          <div className="card" style={{ padding: '2rem', height: '140px' }}><Skeleton height="50px" width="70%" /></div>
        </div>
      ) : socials.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t.contact.noSocialTitle}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            width: '100%',
          }}
        >
          {socials.map((item, idx) => (
            <ScrollReveal key={item.id} delay={idx * 70}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.5rem 1.75rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease',
                  cursor: 'pointer',
                  minHeight: '118px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
                  {/* Dedicated Symmetrical App Icon Container */}
                  <div
                    className="social-icon-box"
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {renderBrandIcon(item.platform)}
                  </div>

                  {/* Clean Uniform Text Formatting */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--primary-500)',
                      }}
                    >
                      {item.platform}
                    </span>

                    <div
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                      }}
                    >
                      {item.username}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {getPlatformSubtitle(item.platform)}
                    </div>
                  </div>
                </div>

                {/* Symmetrical External Arrow Badge */}
                <div
                  className="social-arrow-badge"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(220, 38, 38, 0.12)',
                    color: 'var(--primary-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <ExternalLink size={16} />
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* Official Verification Notice Card */}
      <ScrollReveal delay={180}>
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            padding: '1.75rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              color: 'var(--primary-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
              {t.contact.verifiedTitle}
            </strong>
            {t.contact.verifiedDesc}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};
