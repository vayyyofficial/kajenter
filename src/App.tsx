import React, { useState, useEffect, useCallback } from "react";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SyncProvider } from "./context/SyncContext";
import { Navbar } from "./components/common/Navbar";
import { Footer } from "./components/common/Footer";
import { ToastContainer } from "./components/common/Toast";

import { BerandaPage } from "./pages/BerandaPage";
const GaleriPage = React.lazy(() =>
  import("./pages/GaleriPage").then((m) => ({ default: m.GaleriPage })),
);
const AnggotaPage = React.lazy(() =>
  import("./pages/AnggotaPage").then((m) => ({ default: m.AnggotaPage })),
);
const ContactPage = React.lazy(() =>
  import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })),
);
const AdminPage = React.lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const RollingSeatPage = React.lazy(() =>
  import("./pages/RollingSeatPage").then((m) => ({
    default: m.RollingSeatPage,
  })),
);
const RollingKelompokPage = React.lazy(() =>
  import("./pages/RollingKelompokPage").then((m) => ({
    default: m.RollingKelompokPage,
  })),
);
const NotFoundPage = React.lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

import "./styles/index.css";
import "./styles/components.css";
import "./styles/seating.css";

export interface ResolvedRoute {
  id: string;
  path: string;
  adminSection?: "website" | "rolling";
}

function canonicalizeAdminPath(pathname: string): void {
  if (typeof window === "undefined") return;
  const clean = pathname.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "").toLowerCase();
  if (clean === "rolling-admin" || clean.startsWith("rolling-admin/")) {
    const search = window.location.search || "";
    window.history.replaceState(null, "", `/admin/rolling${search}`);
  }
}

export function parsePath(pathname: string): ResolvedRoute {
  const clean = pathname
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();

  if (clean === "" || clean === "beranda") {
    return { id: "beranda", path: "/beranda" };
  }
  if (clean === "galeri") {
    return { id: "galeri", path: "/galeri" };
  }
  if (clean === "anggota") {
    return { id: "anggota", path: "/anggota" };
  }
  if (clean === "contact") {
    return { id: "contact", path: "/contact" };
  }
  if (clean === "admin/login") {
    return { id: "admin", path: "/admin", adminSection: "website" };
  }
  if (
    clean === "admin/rolling" ||
    clean.startsWith("admin/rolling/") ||
    clean === "rolling-admin" ||
    clean.startsWith("rolling-admin/")
  ) {
    return { id: "admin", path: "/admin/rolling", adminSection: "rolling" };
  }
  if (clean === "admin" || clean.startsWith("admin/")) {
    return { id: "admin", path: "/admin", adminSection: "website" };
  }
  if (
    clean === "rolling-seat" ||
    clean === "denah-duduk" ||
    clean === "denah"
  ) {
    return { id: "rolling-seat", path: "/rolling-seat" };
  }
  if (
    clean === "rolling-kelompok" ||
    clean === "acak-kelompok" ||
    clean === "kelompok"
  ) {
    return { id: "rolling-kelompok", path: "/rolling-kelompok" };
  }

  return { id: "notfound", path: pathname };
}

function getInitialPath(): string {
  if (typeof window === "undefined") return "/beranda";
  if (window.location.hash) {
    const hashClean = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    const hashMap: Record<string, string> = {
      beranda: "/beranda",
      galeri: "/galeri",
      anggota: "/anggota",
      contact: "/contact",
      admin: "/admin",
      "rolling-seat": "/rolling-seat",
      "rolling-kelompok": "/rolling-kelompok",
      "rolling-admin": "/admin/rolling",
    };
    if (hashMap[hashClean]) {
      const target = hashMap[hashClean];
      window.history.replaceState(null, "", target);
      return target;
    }
  }
  const path = window.location.pathname || "/beranda";
  canonicalizeAdminPath(path);
  if (path.replace(/^\/+|\/+$/g, "").toLowerCase().startsWith("rolling-admin")) {
    return "/admin/rolling";
  }
  return path;
}

export function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((targetPathOrRoute: string) => {
    let cleanTarget = targetPathOrRoute.startsWith("/")
      ? targetPathOrRoute
      : `/${targetPathOrRoute}`;

    if (cleanTarget === "/") cleanTarget = "/beranda";
    if (cleanTarget.startsWith("/rolling-admin")) cleanTarget = "/admin/rolling";
    if (cleanTarget === "/admin/login") cleanTarget = "/admin";

    if (window.location.pathname !== cleanTarget) {
      window.history.pushState(null, "", cleanTarget);
    }
    setCurrentPath(cleanTarget);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const resolved = parsePath(currentPath);
  const { isAdmin, logout } = useAdmin();

  useEffect(() => {
    canonicalizeAdminPath(currentPath);
  }, [currentPath]);

  // Leaving the admin area (any non-/admin route) ends the access session,
  // so coming back to /admin always asks for the password again.
  useEffect(() => {
    if (resolved.id !== "admin" && isAdmin) logout();
  }, [resolved.id, isAdmin, logout]);

  return (
    <>
      <Navbar currentRoute={resolved.id} onNavigate={navigateTo} />

      <main className="page-wrapper container">
        <div key={resolved.id === "admin" ? `admin-${resolved.adminSection}` : resolved.id} className="page-enter">
          <React.Suspense
            fallback={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "50vh",
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                Memuat halaman...
              </div>
            }
          >
            {resolved.id === "beranda" && (
              <BerandaPage onNavigate={navigateTo} />
            )}
            {resolved.id === "galeri" && <GaleriPage />}
            {resolved.id === "anggota" && <AnggotaPage />}
            {resolved.id === "contact" && (
              <ContactPage onNavigate={navigateTo} />
            )}
            {resolved.id === "admin" && (
              <AdminPage
                onNavigate={navigateTo}
                section={resolved.adminSection || "website"}
              />
            )}
            {resolved.id === "rolling-seat" && (
              <RollingSeatPage onNavigate={navigateTo} />
            )}
            {resolved.id === "rolling-kelompok" && (
              <RollingKelompokPage onNavigate={navigateTo} />
            )}
            {resolved.id === "notfound" && (
              <NotFoundPage onNavigate={navigateTo} />
            )}
          </React.Suspense>
        </div>
      </main>

      <Footer onNavigate={navigateTo} />
      <ToastContainer />
    </>
  );
}

import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AdminProvider>
          <NotificationProvider>
            <SyncProvider>
              <AppContent />
            </SyncProvider>
          </NotificationProvider>
        </AdminProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
