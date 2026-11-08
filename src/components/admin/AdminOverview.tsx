import React from 'react';
import {
  Users,
  Image as ImageIcon,
  Globe,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AdminMetrics } from '../../types';
import { BRANDING } from '../../config/branding';
import { useCountUp } from '../../hooks/useCountUp';
import { useLanguage } from '../../context/LanguageContext';

interface AdminOverviewProps {
  metrics: AdminMetrics | null;
  onTabChange: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ metrics, onTabChange }) => {
  const { t } = useLanguage();

  // Count-up animations for dashboard metrics
  const animatedMembers = useCountUp(metrics?.totalMembers || 0, 900);
  const animatedGallery = useCountUp(metrics?.galleryCount || 0, 900);
  const animatedSocial = useCountUp(metrics?.socialCount || 0, 700);

  if (!metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
        {t.admin.loadingMetrics}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome School Context Header */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.admin.overviewTag}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.2rem 0' }}>
            {BRANDING.name} — {BRANDING.school}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {BRANDING.program}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700 }}>
          <ShieldCheck size={16} color="var(--primary-500)" />
          <span>{t.admin.sessionActive}</span>
        </div>
      </div>

      {/* Primary KPI Grid (Clean and simplified per Requirement #2) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Total Anggota */}
        <div
          className="card card-hover"
          onClick={() => onTabChange('members')}
          style={{ padding: '1.5rem', cursor: 'pointer', borderLeft: '4px solid var(--primary-600)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t.admin.totalMembers}
            </span>
            <div style={{ padding: '0.45rem', backgroundColor: 'rgba(220, 38, 38, 0.12)', color: 'var(--primary-500)', borderRadius: 'var(--radius-md)' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {animatedMembers}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {t.admin.membersDesc}
          </div>
        </div>

        {/* Galeri Kegiatan */}
        <div
          className="card card-hover"
          onClick={() => onTabChange('gallery')}
          style={{ padding: '1.5rem', cursor: 'pointer', borderLeft: '4px solid var(--primary-600)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t.admin.totalGallery}
            </span>
            <div style={{ padding: '0.45rem', backgroundColor: 'rgba(220, 38, 38, 0.12)', color: 'var(--primary-500)', borderRadius: 'var(--radius-md)' }}>
              <ImageIcon size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {animatedGallery}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {t.admin.galleryDesc}
          </div>
        </div>

        {/* Media Sosial */}
        <div
          className="card card-hover"
          onClick={() => onTabChange('social')}
          style={{ padding: '1.5rem', cursor: 'pointer', borderLeft: '4px solid var(--primary-600)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t.admin.activeSocial}
            </span>
            <div style={{ padding: '0.45rem', backgroundColor: 'rgba(220, 38, 38, 0.12)', color: 'var(--primary-500)', borderRadius: 'var(--radius-md)' }}>
              <Globe size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {animatedSocial}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {t.admin.socialDesc}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Shortcuts */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
          {t.admin.quickActionsTitle}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <button
            onClick={() => onTabChange('gallery')}
            className="btn btn-secondary"
            style={{ justifyContent: 'space-between', padding: '0.85rem 1.15rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ImageIcon size={18} color="var(--primary-500)" />
              <span style={{ fontWeight: 600 }}>{t.admin.manageGallery}</span>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </button>

          <button
            onClick={() => onTabChange('members')}
            className="btn btn-secondary"
            style={{ justifyContent: 'space-between', padding: '0.85rem 1.15rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Users size={18} color="var(--primary-500)" />
              <span style={{ fontWeight: 600 }}>{t.admin.manageMembers}</span>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </button>

          <button
            onClick={() => onTabChange('social')}
            className="btn btn-secondary"
            style={{ justifyContent: 'space-between', padding: '0.85rem 1.15rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Globe size={18} color="var(--primary-500)" />
              <span style={{ fontWeight: 600 }}>{t.admin.manageSocial}</span>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </button>

          <button
            onClick={() => onTabChange('security')}
            className="btn btn-secondary"
            style={{ justifyContent: 'space-between', padding: '0.85rem 1.15rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ShieldCheck size={18} color="var(--primary-500)" />
              <span style={{ fontWeight: 600 }}>{t.admin.manageSecurity}</span>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </button>
        </div>
      </div>
    </div>
  );
};
