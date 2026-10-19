import React from 'react';
import { Home, Wallet, CheckSquare, Calendar, Sparkles, User, Code2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type PortalTabId = 'home' | 'kas' | 'tasks' | 'schedules' | 'piket' | 'profile' | 'dev';

interface PortalBottomNavProps {
  activeTab: PortalTabId;
  onTabChange: (tab: PortalTabId) => void;
  isDeveloper?: boolean;
}

export const PortalBottomNav: React.FC<PortalBottomNavProps> = ({ activeTab, onTabChange, isDeveloper = false }) => {
  const { t } = useLanguage();

  const navItems: Array<{
    id: PortalTabId;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'kas', label: t.portal?.tabs?.kas || 'Kas', icon: Wallet },
    { id: 'tasks', label: 'Tugas', icon: CheckSquare },
    { id: 'schedules', label: 'Jadwal', icon: Calendar },
    { id: 'piket', label: 'Piket', icon: Sparkles },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (isDeveloper) {
    navItems.push({ id: 'dev', label: 'Dev', icon: Code2 });
  }

  return (
    <div className="portal-bottom-nav-container">
      <nav className="portal-bottom-nav-bar" aria-label="Portal Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`portal-nav-btn ${isActive ? 'active' : ''}`}
              title={item.label}
              type="button"
            >
              <div className="icon-badge">
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
