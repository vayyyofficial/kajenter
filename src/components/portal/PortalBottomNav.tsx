import React from 'react';
import { Wallet, CheckSquare, Calendar, Users, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type PortalTabId = 'home' | 'kas' | 'tasks' | 'schedules' | 'piket' | 'profile';

interface PortalBottomNavProps {
  activeTab: PortalTabId;
  onTabChange: (tab: PortalTabId) => void;
}

export const PortalBottomNav: React.FC<PortalBottomNavProps> = ({ activeTab, onTabChange }) => {
  const { t } = useLanguage();
  const isTaskActive = activeTab === 'tasks';

  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--gray-200)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        padding: '0.35rem 0.4rem calc(0.35rem + env(safe-area-inset-bottom, 0px)) 0.4rem',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
        height: '62px',
      }}
    >
      {/* 1. Kas */}
      <button
        onClick={() => onTabChange('kas')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.15rem',
          padding: '0.25rem 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: activeTab === 'kas' ? 'var(--primary-600)' : 'var(--gray-500)',
          fontWeight: activeTab === 'kas' ? 800 : 500,
          fontSize: '0.675rem',
          transition: 'all 0.18s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: activeTab === 'kas' ? 'var(--primary-50)' : 'transparent',
            transition: 'all 0.18s ease',
          }}
        >
          <Wallet size={19} />
        </div>
        <span>{t.portal.tabs.kas}</span>
      </button>

      {/* 2. Jadwal Pelajaran */}
      <button
        onClick={() => onTabChange('schedules')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.15rem',
          padding: '0.25rem 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: activeTab === 'schedules' ? 'var(--primary-600)' : 'var(--gray-500)',
          fontWeight: activeTab === 'schedules' ? 800 : 500,
          fontSize: '0.675rem',
          transition: 'all 0.18s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: activeTab === 'schedules' ? 'var(--primary-50)' : 'transparent',
            transition: 'all 0.18s ease',
          }}
        >
          <Calendar size={19} />
        </div>
        <span>Jadwal</span>
      </button>

      {/* 3. TUGAS - Prominent Elevated QRIS-Style Center Button (Requirement #2 & #40 #9) */}
      <div
        style={{
          flex: 1.1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'relative',
          top: '-16px',
        }}
      >
        <button
          onClick={() => onTabChange('tasks')}
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            border: '3px solid var(--bg-card)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isTaskActive
              ? '0 8px 24px rgba(220, 38, 38, 0.6), 0 0 0 3px rgba(239, 68, 68, 0.35)'
              : '0 6px 18px rgba(220, 38, 38, 0.45)',
            transform: isTaskActive ? 'scale(1.06)' : 'scale(1)',
            transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
            padding: 0,
          }}
          title="Buka Tugas"
        >
          <CheckSquare size={24} strokeWidth={2.6} />
        </button>
        <span
          style={{
            fontSize: '0.675rem',
            fontWeight: 800,
            marginTop: '0.2rem',
            color: isTaskActive ? 'var(--primary-600)' : 'var(--gray-700)',
            letterSpacing: '0.02em',
          }}
        >
          Tugas
        </span>
      </div>

      {/* 4. Jadwal Piket */}
      <button
        onClick={() => onTabChange('piket')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.15rem',
          padding: '0.25rem 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: activeTab === 'piket' ? 'var(--primary-600)' : 'var(--gray-500)',
          fontWeight: activeTab === 'piket' ? 800 : 500,
          fontSize: '0.675rem',
          transition: 'all 0.18s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: activeTab === 'piket' ? 'var(--primary-50)' : 'transparent',
            transition: 'all 0.18s ease',
          }}
        >
          <Users size={19} />
        </div>
        <span>Piket</span>
      </button>

      {/* 5. User Management / Profil */}
      <button
        onClick={() => onTabChange('profile')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.15rem',
          padding: '0.25rem 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: activeTab === 'profile' ? 'var(--primary-600)' : 'var(--gray-500)',
          fontWeight: activeTab === 'profile' ? 800 : 500,
          fontSize: '0.675rem',
          transition: 'all 0.18s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: activeTab === 'profile' ? 'var(--primary-50)' : 'transparent',
            transition: 'all 0.18s ease',
          }}
        >
          <User size={19} />
        </div>
        <span>Profil</span>
      </button>
    </nav>
  );
};
