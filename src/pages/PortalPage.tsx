import React, { useState } from 'react';
import { useMemberAuth } from '../context/MemberAuthContext';
import { PortalHeader } from '../components/portal/PortalHeader';
import { PortalBottomNav, PortalTabId } from '../components/portal/PortalBottomNav';
import { PortalHomeTab } from '../components/portal/PortalHomeTab';
import { PortalKasTab } from '../components/portal/PortalKasTab';
import { PortalTasksTab } from '../components/portal/PortalTasksTab';
import { PortalScheduleTab } from '../components/portal/PortalScheduleTab';
import { PortalProfileTab } from '../components/portal/PortalProfileTab';
import { PortalLogin } from '../components/portal/PortalLogin';

interface PortalPageProps {
  onNavigate: (route: string) => void;
}

export const PortalPage: React.FC<PortalPageProps> = ({ onNavigate }) => {
  const { isAuthenticated, isLoading } = useMemberAuth();

  // Determine active tab from URL path if present
  const getInitialTab = (): PortalTabId => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/kas')) return 'kas';
    if (path.includes('/tugas') || path.includes('/tasks')) return 'tasks';
    if (path.includes('/jadwal-piket') || path.includes('/piket')) return 'piket';
    if (path.includes('/jadwal-pelajaran') || path.includes('/jadwal') || path.includes('/schedules')) return 'schedules';
    if (path.includes('/profile') || path.includes('/profil')) return 'profile';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<PortalTabId>(getInitialTab);

  // Sync tab with URL
  const handleTabChange = (tab: PortalTabId) => {
    setActiveTab(tab);
    let subPath = '/portal';
    if (tab === 'kas') subPath = '/portal/kas';
    else if (tab === 'tasks') subPath = '/portal/tugas';
    else if (tab === 'schedules') subPath = '/portal/jadwal-pelajaran';
    else if (tab === 'piket') subPath = '/portal/jadwal-piket';
    else if (tab === 'profile') subPath = '/portal/profile';

    if (window.location.pathname !== subPath) {
      window.history.pushState(null, '', subPath);
    }
  };

  const handleBackToHome = () => {
    onNavigate('/beranda');
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: 'var(--gray-500)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        Memuat Portal Kelas...
      </div>
    );
  }

  return (
    <div
      className="portal-viewport-wrapper"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
        minHeight: 'calc(100vh - 120px)',
        padding: '0.5rem 0.5rem 2rem 0.5rem',
      }}
    >
      {/* 
        Requirement #9 & #32:
        Smartphone Chassis / Container
        On Desktop: max-width ~440px, centered, rounded app chassis with phone styling
        On Mobile: fluid full width, touch friendly
      */}
      <div className="portal-mobile-chassis">
        {!isAuthenticated ? (
          <PortalLogin onBackToHome={handleBackToHome} />
        ) : (
          <>
            {/* E-Wallet Top Profile Header */}
            <PortalHeader
              onBackToHome={handleBackToHome}
              onGoToDashboard={() => handleTabChange('home')}
            />

            {/* Scrollable Tab Content Area */}
            <main
              style={{
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {activeTab === 'home' && <PortalHomeTab onSwitchTab={handleTabChange} />}
              {activeTab === 'kas' && <PortalKasTab />}
              {activeTab === 'tasks' && <PortalTasksTab />}
              {activeTab === 'schedules' && <PortalScheduleTab defaultSubTab="schedule" />}
              {activeTab === 'piket' && <PortalScheduleTab defaultSubTab="piket" />}
              {activeTab === 'profile' && <PortalProfileTab />}
            </main>

            {/* Bottom Mobile Navigation */}
            <PortalBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          </>
        )}
      </div>
    </div>
  );
};
