import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { BRANDING } from '../../config/branding';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, onNavigate }) => {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Requirements #5, #6, #7: Navbar scroll animation listener
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY || window.pageYOffset || 0;
          // Smooth hysteresis threshold: activate floating at >45px, return to top at <15px
          setIsScrolled((prev) => {
            if (!prev && currentY > 45) return true;
            if (prev && currentY < 15) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on resize above 992px (Requirement #8)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent background scroll when mobile menu is open, accurately restore on close (Requirement #14 & #20)
  // Also support closing with Escape key (Requirement #5)
  useEffect(() => {
    if (mobileMenuOpen) {
      lockScroll();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        unlockScroll();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileMenuOpen]);

  const handleNavClick = (routeOrPath: string) => {
    setMobileMenuOpen(false);
    onNavigate(routeOrPath);
  };

  // Dynamic translated nav items
  const navItems = [
    { id: 'beranda', path: '/beranda', label: t.nav.home },
    { id: 'galeri', path: '/galeri', label: t.nav.gallery },
    { id: 'anggota', path: '/anggota', label: t.nav.members },
    { id: 'contact', path: '/contact', label: t.nav.contact },
    { id: 'portal', path: '/portal', label: t.nav.portal },
  ];

  return (
    <header className={`navbar-wrapper ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="navbar">
        <div className="navbar-inner">
          {/* Brand Logo */}
          <a
            href="/beranda"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('/beranda');
            }}
            className="brand-logo"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              color: 'inherit',
            }}
            title={BRANDING.fullName}
          >
            <img
              src={BRANDING.logoUrl}
              alt={BRANDING.name}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallbackLevel) {
                  target.dataset.fallbackLevel = '1';
                  target.src = BRANDING.fallbackLogoUrl;
                }
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--primary-600)',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                flexShrink: 0,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
            <div className="brand-text">
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  color: 'var(--gray-900)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  transition: 'font-size 0.3s ease',
                }}
              >
                {BRANDING.name}
              </h1>
              <span
                style={{
                  fontSize: '0.725rem',
                  color: 'var(--primary-600)',
                  fontWeight: 700,
                  transition: 'font-size 0.3s ease',
                }}
              >
                {BRANDING.school}
              </span>
            </div>
          </a>

          {/* ========================================================= */}
          {/* DESKTOP NAVBAR: Visible ONLY on Desktop (>= 992px)       */}
          {/* ========================================================= */}
          <nav className="navbar-desktop-nav" aria-label="Navigasi Utama Desktop">
            <ul className="nav-links" style={{ margin: 0, padding: 0, display: 'flex', gap: '0.25rem', listStyle: 'none' }}>
              {navItems.map((item) => {
                const isActive = currentRoute === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(item.path);
                      }}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? 'var(--primary-600)' : 'var(--gray-700)',
                        backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                        borderRadius: 'var(--radius-full)',
                        transition: 'all var(--transition-fast)',
                        textDecoration: 'none',
                        display: 'inline-block',
                      }}
                    >
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Desktop CTA & Controls Action Bar */}
          <div className="navbar-desktop-actions">
            <ThemeToggle />
            <LanguageSwitcher />
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('/contact');
              }}
              className="btn btn-sm btn-primary"
              style={{
                gap: '0.35rem',
                fontWeight: 700,
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)',
                textDecoration: 'none',
              }}
            >
              <span>{t.nav.contactUs}</span>
              <ArrowUpRight size={15} />
            </a>
          </div>

          {/* ========================================================= */}
          {/* MOBILE HAMBURGER BUTTON: Visible ONLY on Mobile (< 992px) */}
          {/* ========================================================= */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="navbar-mobile-toggle">
              <ThemeToggle />
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="navbar-mobile-toggle btn-icon"
              aria-label={mobileMenuOpen ? t.nav.closeNavigation : t.nav.openNavigation}
              aria-expanded={mobileMenuOpen}
              style={{
                color: 'var(--gray-800)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: mobileMenuOpen ? 'var(--gray-100)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE NAVIGATION DRAWER & NEUTRAL BACKDROP (< 992px)     */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <>
          <div
            className="navbar-mobile-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(10, 15, 29, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 90,
              animation: 'fadeIn 0.2s ease-out',
              pointerEvents: 'auto',
            }}
            onClick={() => setMobileMenuOpen(false)}
          />

          <div
            className="navbar-mobile-drawer"
            style={{
              position: 'fixed',
              top: isScrolled ? '68px' : '64px',
              left: isScrolled ? '0.75rem' : 0,
              right: isScrolled ? '0.75rem' : 0,
              maxWidth: isScrolled ? '540px' : '100%',
              margin: isScrolled ? '0 auto' : '0',
              backgroundColor: 'var(--white)',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--gray-200)',
              borderBottom: '2px solid var(--primary-600)',
              borderRadius: isScrolled ? 'var(--radius-lg)' : '0 0 var(--radius-lg) var(--radius-lg)',
              zIndex: 95,
              padding: '1.25rem 1.25rem 1.75rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              animation: 'slideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: 'auto',
            }}
          >
            {/* Mobile Controls Header Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--gray-200)',
                marginBottom: '0.25rem',
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                Preferences
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </div>

            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <a
                  key={item.id}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.path);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                    color: isActive ? 'var(--primary-700)' : 'var(--gray-800)',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--primary-200)' : 'transparent',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-600)',
                      }}
                    />
                  )}
                </a>
              );
            })}

            <div style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('/contact');
                }}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  height: '46px',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-full)',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <span>{t.nav.contactUs}</span>
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
