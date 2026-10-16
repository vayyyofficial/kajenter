import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../services/api';

interface AdminContextType {
  isAdmin: boolean;
  adminToken: string | null;
  secretModalOpen: boolean;
  isLocked: boolean;
  lockoutRemainingMs: number;
  attemptsRemaining: number;
  openSecretModal: () => void;
  closeSecretModal: () => void;
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
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem('x_icp_admin_token')
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [secretModalOpen, setSecretModalOpen] = useState<boolean>(false);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);

  // Check lockout status from server
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

  // Validate existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('x_icp_admin_token');
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        const res = await api.auth.checkAdminSession();
        if (res.success && res.valid) {
          setIsAdmin(true);
        } else {
          localStorage.removeItem('x_icp_admin_token');
          setAdminToken(null);
          setIsAdmin(false);
        }
      } catch {
        localStorage.removeItem('x_icp_admin_token');
        setAdminToken(null);
        setIsAdmin(false);
      }
    };

    checkSession();
    refreshLockoutStatus();
  }, [refreshLockoutStatus]);

  // Handle live countdown when locked
  useEffect(() => {
    if (!isLocked || lockoutRemainingMs <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemainingMs((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          setIsLocked(false);
          refreshLockoutStatus();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, lockoutRemainingMs, refreshLockoutStatus]);

  const openSecretModal = () => {
    refreshLockoutStatus();
    setSecretModalOpen(true);
  };

  const closeSecretModal = () => {
    setSecretModalOpen(false);
  };

  const verifyPassword = async (password: string) => {
    try {
      const res = await api.auth.verifyAdminPassword(password);
      if (res.success && res.token) {
        localStorage.setItem('x_icp_admin_token', res.token);
        setAdminToken(res.token);
        setIsAdmin(true);
        setIsLocked(false);
        setLockoutRemainingMs(0);
        setAttemptsRemaining(3);
        setSecretModalOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Password salah.' };
    } catch (err: any) {
      if (err instanceof ApiError) {
        const data = err.data || {};
        if (err.status === 429 || data.locked) {
          setIsLocked(true);
          setLockoutRemainingMs(data.remainingMs || 12 * 60 * 60 * 1000);
          setAttemptsRemaining(0);
          return {
            success: false,
            locked: true,
            remainingMs: data.remainingMs,
            error: err.message,
          };
        }
        if (data.attemptsLeft !== undefined) {
          setAttemptsRemaining(data.attemptsLeft);
          return {
            success: false,
            locked: false,
            attemptsLeft: data.attemptsLeft,
            error: err.message,
          };
        }
      }
      return { success: false, error: err.message || 'Verifikasi password gagal.' };
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

  const logout = () => {
    localStorage.removeItem('x_icp_admin_token');
    setAdminToken(null);
    setIsAdmin(false);
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminToken,
        secretModalOpen,
        isLocked,
        lockoutRemainingMs,
        attemptsRemaining,
        openSecretModal,
        closeSecretModal,
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
