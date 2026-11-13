import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Users,
  Globe,
  Settings,
  ShieldCheck,
  Clock,
  LogOut,
  ArrowLeft,
  Armchair,
  Grid3x3,
  History as HistoryIcon,
  CalendarClock,
  UserCheck,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useLanguage } from '../context/LanguageContext';
import { AdminMetrics } from '../types';
import { api } from '../services/api';
import { BRANDING } from '../config/branding';

import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminGallery } from '../components/admin/AdminGallery';
import { AdminMembers } from '../components/admin/AdminMembers';
import { AdminSocial } from '../components/admin/AdminSocial';
import { AdminWebsiteSettings } from '../components/admin/AdminWebsiteSettings';
import { AdminSecurity } from '../components/admin/AdminSecurity';
import { AdminAuditLogs } from '../components/admin/AdminAuditLogs';
import { AdminLoginPage } from './AdminLoginPage';
import { RollingAdminPage } from './RollingAdminPage';

interface AdminPageProps {
  onNavigate: (route: string) => void;
  section?: 'website' | 'rolling';
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate, section = 'website' }) => {
  const { t } = useLanguage();
  const { isAdmin, logout } = useAdmin();
  const [activeTab, setActiveTab] = useState<string>(section === 'rolling' ? 'rolling-overview' : 'overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const isRollingTab = activeTab.startsWith('rolling-');

  const fetchMetrics = async () => {
    try {
      const res = await api.admin.getMetrics();
      if (res.success) setMetrics(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAdmin && !isRollingTab) {
      fetchMetrics();
    }
  }, [isAdmin, activeTab, isRollingTab]);

  if (!isAdmin) {
    return (
      <AdminLoginPage
        onNavigate={onNavigate}
        successPath="/admin"
      />
    );
  }

  const navTabs = [
    { id: 'overview', label: t.admin.tabOverview, icon: LayoutDashboard },
    { id: 'gallery', label: t.admin.tabGallery, icon: ImageIcon },
    { id: 'members', label: t.admin.tabMembers, icon: Users },
    { id: 'social', label: t.admin.tabSocial, icon: Globe },
    { id: 'website', label: t.admin.tabWebsite, icon: Settings },
    { id: 'security', label: t.admin.tabSecurity, icon: ShieldCheck },
    { id: 'audit', label: t.admin.tabAudit, icon: Clock },
    { id: 'rolling-overview', label: 'Rolling: Ringkasan', icon: Armchair },
    { id: 'rolling-layout', label: 'Rolling: Tata Letak', icon: Grid3x3 },
    { id: 'rolling-students', label: 'Rolling: Siswa', icon: UserCheck },
    { id: 'rolling-seating', label: 'Rolling: Denah & Reroll', icon: Armchair },
    { id: 'rolling-history', label: 'Rolling: Riwayat', icon: HistoryIcon },
    { id: 'rolling-schedule', label: 'Rolling: Jadwal', icon: CalendarClock },
  ];

  const handleLogout = () => {
    logout();
    onNavigate('/admin');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <img
            src={BRANDING.logoUrl}
            alt={BRANDING.name}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--primary-600)',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1.2 }}>
                {t.admin.panelTitle}
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                {t.admin.authenticatedBadge}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {`Pusat Pengelolaan Konten & Keamanan ${BRANDING.name} — ${BRANDING.school}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate('beranda')}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 600 }}
          >
            <ArrowLeft size={15} />
            <span>Lihat Website</span>
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-danger btn-sm"
            style={{ fontWeight: 700 }}
          >
            <LogOut size={15} />
            <span>{t.admin.logout}</span>
          </button>
        </div>
      </div>

      <>
          <div
            style={{
              display: 'flex',
              overflowX: 'auto',
              gap: '0.4rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--border-color)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: isActive ? 'var(--primary-600)' : 'var(--bg-card)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.55rem 0.95rem',
                    border: isActive ? '1px solid var(--primary-600)' : '1px solid var(--border-color)',
                    flexShrink: 0,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            {activeTab === 'overview' && (
              <AdminOverview
                metrics={metrics}
                onTabChange={(tab) => setActiveTab(tab === 'rolling' ? 'rolling-overview' : tab)}
              />
            )}
            {activeTab === 'gallery' && <AdminGallery />}
            {activeTab === 'members' && <AdminMembers />}
            {activeTab === 'social' && <AdminSocial />}
            {activeTab === 'website' && <AdminWebsiteSettings />}
            {activeTab === 'security' && <AdminSecurity onLogout={handleLogout} />}
            {activeTab === 'audit' && <AdminAuditLogs />}
            {isRollingTab && (
              <RollingAdminPage
                onNavigate={onNavigate}
                embedded
                tab={activeTab.replace('rolling-', '')}
                onTabChange={(tab: string) => setActiveTab(`rolling-${tab}`)}
              />
            )}
          </div>
      </>
    </div>
  );
};
