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
import { BRANDING } from '../config/branding';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { Skeleton } from '../components/common/Skeleton';
import { useRealtimeSync } from '../context/SyncContext';

interface ContactPageProps {
  onNavigate: (route: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = () => {
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
          style={{ color: 'var(--primary-600)', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>{iconData.title}</title>
          <path d={iconData.path} />
        </svg>
      );
    }

    if (p.includes('email') || p.includes('surat')) {
      return <Mail size={24} color="var(--primary-600)" />;
    }

    return <Globe size={24} color="var(--primary-600)" />;
  };

  const getPlatformSubtitle = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return 'Dokumentasi, Story & Reels';
    if (p.includes('tiktok')) return 'Video Kreatif & Edukasi';
    if (p.includes('discord')) return 'Tech Lounge & Diskusi Kelas';
    return 'Kanal Informasi Resmi';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div className="section-header" style={{ textAlign: 'center' }}>
        <div className="section-tag" style={{ margin: '0 auto 1rem auto' }}>
          <Sparkles size={14} />
          <span>Komunikasi Terpadu</span>
        </div>
        <h1 className="section-title">Media Sosial Resmi Kelas</h1>
        <p className="section-subtitle" style={{ margin: '0 auto', maxWidth: '640px' }}>
          Hubungi pengurus kelas, ikuti dokumentasi kegiatan terkini, dan jalin komunikasi kejuruan melalui kanal digital resmi {BRANDING.name} {BRANDING.school}.
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
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--gray-500)' }}>
          Belum ada media sosial yang dipublikasikan.
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
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--gray-200)',
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
                        color: 'var(--primary-600)',
                      }}
                    >
                      {item.platform}
                    </span>

                    <div
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--gray-900)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                      }}
                    >
                      {item.username}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 500 }}>
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
                    backgroundColor: 'var(--primary-50)',
                    color: 'var(--primary-600)',
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
            backgroundColor: 'var(--gray-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--gray-200)',
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
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--gray-900)', display: 'block', marginBottom: '0.2rem' }}>
              Kanal Komunikasi Terverifikasi Kelas
            </strong>
            Seluruh tautan resmi di atas dikelola langsung oleh Sekretaris dan Pengurus Kelas <strong>{BRANDING.name} — {BRANDING.school}</strong>. Segala informasi resmi mengenai kegiatan akademik kejuruan, dokumentasi, dan pengumuman kelas disiarkan melalui portal digital ini serta kanal resmi tertera.
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};
