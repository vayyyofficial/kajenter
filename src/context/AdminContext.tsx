import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../services/api';
import {
  clearAdminMemorySession,
  setAdminApiToken,
} from '../services/adminSession';

interface AdminContextType {
  isAdmin: boolean;
  adminToken: string | null;
  isSessionLoading: boolean;
  isLocked: boolean;
  lockoutRemainingMs: number;
  attemptsRemaining: number;
  verifyPassword: (password: string) => Promise<{
    success: boolean;
    error?: string;
    locked?: boolean;
    remainingMs?: number;
    attemptsLeft?: number;
  }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  refreshLockoutStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSessionLoading] = useState<boolean>(false);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);

  const refreshLockoutStatus = useCallback(async () => {
    try {
      const res = await api.auth.checkAdminStatus();
      if (res.locked) {
        setIsLocked(true);
        setLockoutRemainingMs(res.remainingMs);
        setAttemptsRemaining(0);
      } else {
        setIsLocked(false);
        setLockoutRemainingMs(0);
        setAttemptsRemaining(res.attemptsRemaining ?? 3);
      }
    } catch {
      // Ignore network errors on background poll
    }
  }, []);

  useEffect(() => {
    clearAdminMemorySession();
    setAdminApiToken(null);
    void refreshLockoutStatus();
  }, [refreshLockoutStatus]);

  const verifyPassword = async (password: string) => {
    try {
      const res = await api.auth.verifyAdminPassword(password);
      if (res.success && res.token) {
        setAdminApiToken(res.token);
        setAdminToken(res.token);
        setIsAdmin(true);
        setIsLocked(false);
        setLockoutRemainingMs(0);
        setAttemptsRemaining(5);
        return { success: true };
      }
      const attemptsLeft = res.attemptsRemaining ?? Math.max(0, attemptsRemaining - 1);
      setAttemptsRemaining(attemptsLeft);
      setIsLocked(Boolean(res.locked));
      setLockoutRemainingMs(res.remainingMs ?? 0);
      return { success: false, error: res.error || 'Password salah. Silakan coba lagi.', locked: Boolean(res.locked), remainingMs: res.remainingMs, attemptsLeft };
    } catch (err: any) {
      const data = err instanceof ApiError ? err.data : {};
      const errorMsg = data?.error || err.message || 'Password salah. Silakan periksa kembali password Anda.';
      const attemptsLeft = Number.isFinite(data?.attemptsRemaining) ? Number(data.attemptsRemaining) : Math.max(0, attemptsRemaining - 1);
      setAttemptsRemaining(attemptsLeft);
      setIsLocked(Boolean(data?.locked));
      setLockoutRemainingMs(Number(data?.remainingMs || 0));
      return { success: false, error: errorMsg, locked: Boolean(data?.locked), remainingMs: Number(data?.remainingMs || 0), attemptsLeft };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    try {
      const res = await api.auth.changeAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengubah password admin.' };
    }
  };

  const logout = useCallback(() => {
    clearAdminMemorySession();
    setAdminApiToken(null);
    setAdminToken(null);
    setIsAdmin(false);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminToken,
        isSessionLoading,
        isLocked,
        lockoutRemainingMs,
        attemptsRemaining,
        verifyPassword,
        changePassword,
        logout,
        refreshLockoutStatus,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
