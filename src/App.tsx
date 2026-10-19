import React, { useState, useEffect, useCallback } from 'react';
import { AdminProvider } from './context/AdminContext';
import { NotificationProvider } from './context/NotificationContext';
import { SyncProvider } from './context/SyncContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/Toast';
import { SecretAdminModal } from './components/common/SecretAdminModal';

import { BerandaPage } from './pages/BerandaPage';
const GaleriPage = React.lazy(() => import('./pages/GaleriPage').then((m) => ({ default: m.GaleriPage })));
const AnggotaPage = React.lazy(() => import('./pages/AnggotaPage').then((m) => ({ default: m.AnggotaPage })));
const ContactPage = React.lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const AdminPage = React.lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const PortalPage = React.lazy(() => import('./pages/PortalPage').then((m) => ({ default: m.PortalPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
import { MemberAuthProvider } from './context/MemberAuthContext';

import './styles/index.css';
import './styles/components.css';

export interface ResolvedRoute {
  id: string; // 'beranda' | 'galeri' | 'anggota' | 'contact' | 'admin' | 'portal' | 'notfound'
  path: string;
}

export function parsePath(pathname: string): ResolvedRoute {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

  if (clean === '' || clean === 'beranda') {
    return { id: 'beranda', path: '/beranda' };
  }
  if (clean === 'galeri') {
    return { id: 'galeri', path: '/galeri' };
  }
  if (clean === 'anggota') {
    return { id: 'anggota', path: '/anggota' };
  }
  if (clean === 'contact') {
    return { id: 'contact', path: '/contact' };
  }
  if (clean === 'admin' || clean.startsWith('admin/')) {
    return { id: 'admin', path: '/admin' };
  }
  if (clean === 'portal' || clean.startsWith('portal/')) {
    return { id: 'portal', path: pathname };
  }

  return { id: 'notfound', path: pathname };
}

function getInitialPath(): string {
  if (typeof window === 'undefined') return '/beranda';
  if (window.location.hash) {
    const hashClean = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (['beranda', 'galeri', 'anggota', 'contact', 'admin', 'portal'].includes(hashClean)) {
      const target = `/${hashClean}`;
      window.history.replaceState(null, '', target);
      return target;
    }
  }
  return window.location.pathname || '/beranda';
}

export function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);

  // Listen to browser Back and Forward navigation events
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((targetPathOrRoute: string) => {
    let cleanTarget = targetPathOrRoute.startsWith('/')
      ? targetPathOrRoute
      : `/${targetPathOrRoute}`;

    if (cleanTarget === '/') cleanTarget = '/beranda';

    if (window.location.pathname !== cleanTarget) {
      window.history.pushState(null, '', cleanTarget);
    }
    setCurrentPath(cleanTarget);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const resolved = parsePath(currentPath);

  // Standalone Portal Kelas App: No Website Navbar, No Website Footer on ANY device
  if (resolved.id === 'portal') {
    return (
      <div className="portal-app-standalone-container">
        <React.Suspense
          fallback={
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
          }
        >
          <PortalPage onNavigate={navigateTo} />
        </React.Suspense>
        <ToastContainer />
      </div>
    );
  }

  return (
    <>
      <Navbar currentRoute={resolved.id} onNavigate={navigateTo} />

      <main className="page-wrapper container">
        <div key={resolved.id} className="page-enter">
          <React.Suspense
            fallback={
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
                Memuat halaman...
              </div>
            }
          >
            {resolved.id === 'beranda' && <BerandaPage onNavigate={navigateTo} />}
            {resolved.id === 'galeri' && <GaleriPage />}
            {resolved.id === 'anggota' && <AnggotaPage />}
            {resolved.id === 'contact' && <ContactPage onNavigate={navigateTo} />}
            {resolved.id === 'admin' && <AdminPage onNavigate={navigateTo} />}
            {resolved.id === 'notfound' && <NotFoundPage onNavigate={navigateTo} />}
          </React.Suspense>
        </div>
      </main>

      <Footer onNavigate={navigateTo} />
      <ToastContainer />
      <SecretAdminModal onSuccessNavigate={navigateTo} />
    </>
  );
}

import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AdminProvider>
          <MemberAuthProvider>
            <NotificationProvider>
              <SyncProvider>
                <AppContent />
              </SyncProvider>
            </NotificationProvider>
          </MemberAuthProvider>
        </AdminProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
