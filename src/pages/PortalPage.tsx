import React, { useState, useEffect, useCallback } from 'react';
import { useMemberAuth } from '../context/MemberAuthContext';
import { PortalHeader } from '../components/portal/PortalHeader';
import { PortalBottomNav, PortalTabId } from '../components/portal/PortalBottomNav';
import { PortalHomeTab } from '../components/portal/PortalHomeTab';
import { PortalKasTab } from '../components/portal/PortalKasTab';
import { PortalTasksTab } from '../components/portal/PortalTasksTab';
import { PortalScheduleTab } from '../components/portal/PortalScheduleTab';
import { PortalProfileTab } from '../components/portal/PortalProfileTab';
import { PortalDevTab } from '../components/portal/PortalDevTab';
import { PortalLogin } from '../components/portal/PortalLogin';
import { PortalMaintenanceView } from '../components/portal/PortalMaintenanceView';
import { PortalTaskNotification } from '../components/portal/PortalTaskNotification';
import { useRealtimeSync } from '../context/SyncContext';
import { api } from '../services/api';
import { ClassTask } from '../types';
import { Wrench } from 'lucide-react';

interface PortalPageProps {
  onNavigate: (route: string) => void;
}

export const PortalPage: React.FC<PortalPageProps> = ({ onNavigate }) => {
  const { isAuthenticated, isLoading, member, logout } = useMemberAuth();
  const isDeveloper = Boolean(
    member?.permissions?.isDeveloper ||
    member?.role?.toLowerCase() === 'developer'
  );

  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  const checkMaintenance = useCallback(async () => {
    try {
      const res = await api.portal.maintenance.getStatus();
      if (res && res.success) {
        setIsMaintenance(Boolean(res.maintenance));
      }
    } catch {
      // If error checking maintenance, keep safe state
    } finally {
      setCheckingMaintenance(false);
    }
  }, []);

  useEffect(() => {
    checkMaintenance();
  }, [checkMaintenance]);

  // Real-time synchronization for maintenance mode toggle
  useRealtimeSync(['settings'], checkMaintenance);

  // Determine active tab from URL path if present
  const getInitialTab = (): PortalTabId => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/kas')) return 'kas';
    if (path.includes('/tugas') || path.includes('/tasks')) return 'tasks';
    if (path.includes('/jadwal-piket') || path.includes('/piket')) return 'piket';
    if (path.includes('/jadwal-pelajaran') || path.includes('/jadwal') || path.includes('/schedules')) return 'schedules';
    if (path.includes('/dev')) return isDeveloper ? 'dev' : 'home';
    if (path.includes('/profile') || path.includes('/profil')) return 'profile';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<PortalTabId>(getInitialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<PortalTabId>>(() => new Set([getInitialTab()]));
  const [targetTaskId, setTargetTaskId] = useState<number | null>(null);
  const [isDueNotifDismissed, setIsDueNotifDismissed] = useState<boolean>(false);

  // Sync tab with URL & preserve visited tab instances
  const handleTabChange = (tab: PortalTabId) => {
    if (tab === 'dev' && !isDeveloper) {
      tab = 'home';
    }
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    setActiveTab(tab);
    let subPath = '/portal';
    if (tab === 'kas') subPath = '/portal/kas';
    else if (tab === 'tasks') subPath = '/portal/tugas';
    else if (tab === 'schedules') subPath = '/portal/jadwal-pelajaran';
    else if (tab === 'piket') subPath = '/portal/jadwal-piket';
    else if (tab === 'profile') subPath = '/portal/profile';
    else if (tab === 'dev') subPath = '/portal/dev';

    if (window.location.pathname !== subPath) {
      window.history.pushState(null, '', subPath);
    }
  };

  const handleBackToHome = () => {
    onNavigate('/beranda');
  };

  const handleViewTaskFromNotif = (task: ClassTask) => {
    setTargetTaskId(task.id);
    handleTabChange('tasks');
  };

  if (isLoading || checkingMaintenance) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        Memuat Portal Kelas...
      </div>
    );
  }

  // 1. Maintenance Mode Active & Not Developer: Block regular access
  if (isMaintenance && !isDeveloper) {
    return (
      <div className="portal-viewport-wrapper">
        <PortalMaintenanceView
          onBackToHome={handleBackToHome}
          isLoggedIn={isAuthenticated}
          onLogout={logout}
        />
      </div>
    );
  }

  return (
    <div className="portal-viewport-wrapper">
      {!isAuthenticated ? (
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            margin: 'auto',
            padding: '2rem 1rem',
            boxSizing: 'border-box',
          }}
        >
          <PortalLogin onBackToHome={handleBackToHome} />
        </div>
      ) : (
        <div className="portal-app-container">
          {/* Top Developer Maintenance Banner if active (Requirement #9) */}
          {isMaintenance && isDeveloper && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--primary-600, #dc2626)',
                padding: '0.6rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                backdropFilter: 'blur(8px)',
                position: 'sticky',
                top: 0,
                zIndex: 40,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wrench size={15} style={{ flexShrink: 0 }} />
                <span>Mode Pemeliharaan Aktif (Akses Khusus Developer). Anggota biasa diblokir saat ini.</span>
              </div>
              <button
                onClick={() => handleTabChange('dev')}
                type="button"
                className="btn btn-sm btn-primary"
                style={{
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                Kelola Status
              </button>
            </div>
          )}

          {/* Top Profile Header */}
          <PortalHeader
            onBackToHome={handleBackToHome}
            onGoToDashboard={() => handleTabChange('home')}
          />

          {/* H-1 Task Due Notification (Requirements #9, #10, #11, #12, #13) - Only in Portal Kelas */}
          <PortalTaskNotification
            isDismissed={isDueNotifDismissed}
            onDismiss={() => setIsDueNotifDismissed(true)}
            onViewTask={handleViewTaskFromNotif}
          />

          {/* Full-width Responsive Main Content Area with Tab State Preservation */}
          <main className="portal-main-content">
            {visitedTabs.has('home') && (
              <div style={{ display: activeTab === 'home' ? 'flex' : 'none', flexDirection: 'column', width: '100%' }}>
                <PortalHomeTab onSwitchTab={handleTabChange} />
              </div>
            )}
            {visitedTabs.has('kas') && (
              <div style={{ display: activeTab === 'kas' ? 'flex' : 'none', flexDirection: 'column', width: '100%' }}>
                <PortalKasTab />
              </div>
            )}
            {visitedTabs.has('tasks') && (
              <div style={{ display: activeTab === 'tasks' ? 'flex' : 'none', flexDirection: 'column', width: '100%' }}>
                <PortalTasksTab
                  targetTaskId={targetTaskId}
                  onClearTargetTask={() => setTargetTaskId(null)}
                />
              </div>
            )}
            {visitedTabs.has('schedules') && (
              <div style={{ display: activeTab === 'schedules' ? 'flex' : 'none', flexDirection: 'column', width: '100%' }}>
                <PortalScheduleTab defaultSubTab="schedule" />
              </div>
            )}
            {visitedTabs.has('piket') && (
              <div style={{ display: activeTab === 'piket' ? 'flex' : 'none', flexDirection: 'column', width: '100%' }}>
                <PortalScheduleTab defaultSubTab="piket" />
              </div>
            )}
            {visitedTabs.has('profile') && (
              <div style={{ display: activeTab === 'profile' ? 'flex' : 'none', flexDirection: 'column', width: '100%' }}>
                <PortalProfileTab />
              </div>
            )}
            {isDeveloper && visitedTabs.has('dev') && (
              <div style={{ display: activeTab === 'dev' ? 'flex' : 'none', flexDirection: 'column', width: '100%' }}>
                <PortalDevTab />
              </div>
            )}
          </main>

          {/* Persistent Bottom App Navigation Dock (Stay at bottom for Desktop & Mobile) */}
          <PortalBottomNav activeTab={activeTab} onTabChange={handleTabChange} isDeveloper={isDeveloper} />
        </div>
      )}
    </div>
  );
};

