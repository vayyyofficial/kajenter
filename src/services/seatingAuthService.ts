import { seatingStorageService } from './seatingStorageService';

const ADMIN_PASSWORD = 'kajenter35_2026';
const SESSION_KEY = 'admin_session';

export interface SeatingUser {
  name: string;
  role: string;
  loginTime?: string;
}

export const seatingAuthService = {
  /**
   * Log in with fixed admin password.
   */
  async login(password: string): Promise<{ success: boolean; message?: string; user?: SeatingUser }> {
    if (!password || !password.trim()) {
      return {
        success: false,
        message: 'Kata sandi administrator wajib diisi.',
      };
    }

    if (password.trim() === ADMIN_PASSWORD) {
      const session: SeatingUser = {
        role: 'ADMIN',
        name: 'Administrator Kelas',
        loginTime: new Date().toISOString(),
      };
      seatingStorageService.set(SESSION_KEY, session);
      return { success: true, user: session };
    }

    return {
      success: false,
      message: 'Kata sandi salah. Silakan coba lagi.',
    };
  },

  /**
   * Log out session.
   */
  async logout(): Promise<void> {
    seatingStorageService.remove(SESSION_KEY);
  },

  /**
   * Retrieve active session.
   */
  getSession(): SeatingUser | null {
    return seatingStorageService.get<SeatingUser>(SESSION_KEY, null);
  },

  /**
   * Check if user is currently authenticated.
   */
  isAuthenticated(): boolean {
    const session = this.getSession();
    return Boolean(session && session.role === 'ADMIN');
  },

  /**
   * Get current user profile.
   */
  getCurrentUser(): SeatingUser | null {
    const session = this.getSession();
    return session
      ? {
          name: session.name || 'Administrator Kelas',
          role: session.role || 'ADMIN',
        }
      : null;
  },

  /**
   * Auth state listener compatibility.
   */
  onAuthStateChange(_callback: (user: SeatingUser | null) => void): () => void {
    return () => {};
  },
};
