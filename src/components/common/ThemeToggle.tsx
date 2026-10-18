import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Modern, minimal Dark/Light theme toggle button.
 * Uses Sun & Moon icons with subtle transitions.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', style }) => {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const label = isDark ? t.switcher.themeLight : t.switcher.themeDark;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'var(--gray-100)',
        border: '1px solid var(--gray-200)',
        color: isDark ? '#fbbf24' : 'var(--gray-700)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.borderColor = 'var(--primary-400)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = 'var(--gray-200)';
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
