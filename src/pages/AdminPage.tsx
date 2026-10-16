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
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
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
  const { isAdmin, logout, openSecretModal } = useAdmin();
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

  // If unauthenticated, deny access (Requirement #10: Server-side & Client-side protection)
  if (!isAdmin) {
    return (
      <div
        className="card"
        style={{
          maxWidth: '540px',
          margin: '3rem auto',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          borderTop: '4px solid var(--primary-600)',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
          Akses Rahasia Terproteksi
        </h2>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          Halaman Secret Admin Panel memerlukan verifikasi password pengelola resmi. Silakan buka akses melalui area rahasia pada footer website.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => onNavigate('beranda')}
            className="btn btn-secondary"
            style={{ fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda</span>
          </button>

          <button
            onClick={openSecretModal}
            className="btn btn-primary"
            style={{ fontWeight: 700 }}
          >
            <ShieldCheck size={16} />
            <span>Masukkan Password</span>
          </button>
        </div>
      </div>
    );
  }

  const navTabs = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gallery', label: 'Galeri Foto', icon: ImageIcon },
    { id: 'members', label: 'Data Anggota', icon: Users },
    { id: 'social', label: 'Media Sosial', icon: Globe },
    { id: 'website', label: 'Pengaturan Website', icon: Settings },
    { id: 'security', label: 'Keamanan & Password', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Log', icon: Clock },
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
          borderBottom: '1px solid var(--gray-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            src={BRANDING.logoUrl}
            alt={BRANDING.name}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--primary-600)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0, lineHeight: 1.2 }}>
                Secret Admin Panel
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                AUTHENTICATED
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 500 }}>
              Pusat Pengelolaan Konten & Keamanan {BRANDING.name} — {BRANDING.school}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            <span>Logout</span>
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
          borderBottom: '2px solid var(--gray-200)',
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
                backgroundColor: isActive ? 'var(--primary-600)' : 'var(--gray-100)',
                color: isActive ? '#ffffff' : 'var(--gray-700)',
                fontWeight: isActive ? 700 : 500,
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 0.95rem',
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
