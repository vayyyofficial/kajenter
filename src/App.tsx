import React, { useState, useEffect, useCallback } from 'react';
import { AdminProvider } from './context/AdminContext';
import { NotificationProvider } from './context/NotificationContext';
import { SyncProvider } from './context/SyncContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/Toast';
import { SecretAdminModal } from './components/common/SecretAdminModal';

import { BerandaPage } from './pages/BerandaPage';
import { GaleriPage } from './pages/GaleriPage';
import { AnggotaPage } from './pages/AnggotaPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

import './styles/index.css';
import './styles/components.css';

export interface ResolvedRoute {
  id: string; // 'beranda' | 'galeri' | 'anggota' | 'contact' | 'admin' | 'notfound'
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

  return { id: 'notfound', path: pathname };
}

function getInitialPath(): string {
  if (typeof window === 'undefined') return '/beranda';
  if (window.location.hash) {
    const hashClean = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (['beranda', 'galeri', 'anggota', 'contact', 'admin'].includes(hashClean)) {
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

  return (
    <>
      <Navbar currentRoute={resolved.id} onNavigate={navigateTo} />

      <main className="page-wrapper container">
        <div key={resolved.id} className="page-enter">
          {resolved.id === 'beranda' && <BerandaPage onNavigate={navigateTo} />}
          {resolved.id === 'galeri' && <GaleriPage />}
          {resolved.id === 'anggota' && <AnggotaPage />}
          {resolved.id === 'contact' && <ContactPage onNavigate={navigateTo} />}
          {resolved.id === 'admin' && <AdminPage onNavigate={navigateTo} />}
          {resolved.id === 'notfound' && <NotFoundPage onNavigate={navigateTo} />}
        </div>
      </main>

      <Footer onNavigate={navigateTo} />
      <ToastContainer />
      <SecretAdminModal onSuccessNavigate={navigateTo} />
    </>
  );
}

export function App() {
  return (
    <AdminProvider>
      <NotificationProvider>
        <SyncProvider>
          <AppContent />
        </SyncProvider>
      </NotificationProvider>
    </AdminProvider>
  );
}

export default App;
