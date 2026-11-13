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

interface AdminPageProps {
  onNavigate: (route: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { isAdmin, isSessionLoading, logout } = useAdmin();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await api.admin.getMetrics();
      if (res.success) setMetrics(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
    }
  }, [isAdmin, activeTab]);

  // Tanpa sesi admin yang valid, arahkan ke halaman login terpusat
  useEffect(() => {
    if (!isSessionLoading && !isAdmin) {
      onNavigate('/admin/login');
    }
  }, [isSessionLoading, isAdmin, onNavigate]);

  if (isSessionLoading || !isAdmin) {
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
        {isSessionLoading ? t.adminLogin.checkingSession : t.adminLogin.redirecting}
      </div>
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
  ];

  const handleLogout = () => {
    logout();
    onNavigate('beranda');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header Bar for Admin */}
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
              {language === 'en'
                ? `Content Management & Security Center • ${BRANDING.name} — ${BRANDING.school}`
                : `Pusat Pengelolaan Konten & Keamanan ${BRANDING.name} — ${BRANDING.school}`}
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
            <span>{language === 'en' ? 'View Website' : 'Lihat Website'}</span>
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

      {/* Admin Horizontal Tabs Bar (Requirement #37: Dashboard, Content, Settings) */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '0.4rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid var(--border-color)',
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

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <AdminOverview
            metrics={metrics}
            onTabChange={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'gallery' && <AdminGallery />}
        {activeTab === 'members' && <AdminMembers />}
        {activeTab === 'social' && <AdminSocial />}
        {activeTab === 'website' && <AdminWebsiteSettings />}
        {activeTab === 'security' && <AdminSecurity onLogout={() => onNavigate('beranda')} />}
        {activeTab === 'audit' && <AdminAuditLogs />}
      </div>
    </div>
  );
};
