/**
 * Main admin session (single source of truth for ALL admin features,
 * including Class Rolling).
 *
 * The JWT is issued by the backend (`POST /api/auth/admin-verify`) and is
 * kept in memory only, so a refresh, new tab, or closed tab asks for the
 * password again. The legacy browser-storage key `x_icp_admin_token` is
 * never written; it is only wiped for cleanup.
 */

let memoryAdminToken: string | null = null;

export function setAdminApiToken(token: string | null): void {
  memoryAdminToken = token;
}

export function getAdminApiToken(): string | null {
  return memoryAdminToken;
}

/** True while the main admin session is active (used by Rolling services). */
export function isAdminSessionActive(): boolean {
  return Boolean(memoryAdminToken);
}

export function clearAdminMemorySession(): void {
  memoryAdminToken = null;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('x_icp_admin_token');
    localStorage.removeItem('x_icp_admin_token');
    localStorage.removeItem('admin_session');
  } catch {
    // Ignore storage access errors (private mode, etc.)
  }
}
