import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Modern, compact Language Switcher component (EN | ID).
 * Responsive on desktop and mobile navbar.
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', style }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className={`lang-switcher-container ${className}`}
      role="group"
      aria-label="Language selection"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--gray-100)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-full)',
        padding: '2px',
        gap: '2px',
        userSelect: 'none',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        title={t.switcher.switchToEn}
        style={{
          padding: '0.28rem 0.65rem',
          fontSize: '0.75rem',
          fontWeight: language === 'en' ? 800 : 600,
          borderRadius: 'var(--radius-full)',
          backgroundColor: language === 'en' ? 'var(--primary-600)' : 'transparent',
          color: language === 'en' ? '#ffffff' : 'var(--gray-600)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          lineHeight: 1,
        }}
      >
        EN
      </button>

      <span
        style={{
          fontSize: '0.7rem',
          color: 'var(--gray-400)',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        |
      </span>

      <button
        type="button"
        onClick={() => setLanguage('id')}
        aria-pressed={language === 'id'}
        title={t.switcher.switchToId}
        style={{
          padding: '0.28rem 0.65rem',
          fontSize: '0.75rem',
          fontWeight: language === 'id' ? 800 : 600,
          borderRadius: 'var(--radius-full)',
          backgroundColor: language === 'id' ? 'var(--primary-600)' : 'transparent',
          color: language === 'id' ? '#ffffff' : 'var(--gray-600)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          lineHeight: 1,
        }}
      >
        ID
      </button>
    </div>
  );
};

export default LanguageSwitcher;
