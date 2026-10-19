import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../services/api';
import { AuthMember, Member } from '../types';

interface MemberAuthContextType {
  member: AuthMember | null;
  memberToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{
    success: boolean;
    error?: string;
    isFirstLogin?: boolean;
    member?: AuthMember;
  }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Partial<Member> & { photo_number?: string; photoNumber?: string; customPhotoNumber?: string }) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  changePassword: (payload: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword?: string;
    code: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  changeEmail: (payload: {
    newEmail: string;
    code: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  requestVerificationCode: (
    type: 'password' | 'email',
    options?: { currentPassword?: string; newEmail?: string }
  ) => Promise<{ success: boolean; error?: string; message?: string; expiryMinutes?: number; code?: string }>;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'x_icp_member_token';
const MEMBER_DATA_KEY = 'x_icp_member_data';

export const MemberAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memberToken, setMemberToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [member, setMember] = useState<AuthMember | null>(() => {
    try {
      const saved = localStorage.getItem(MEMBER_DATA_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? Boolean(localStorage.getItem(TOKEN_KEY)) : false;
  });

  // Refresh profile from server
  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setMember(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.portal.auth.getMe();
      if (res.success && res.member) {
        setMember(res.member);
        localStorage.setItem(MEMBER_DATA_KEY, JSON.stringify(res.member));
      } else {
        // Token invalid or expired
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(MEMBER_DATA_KEY);
        setMemberToken(null);
        setMember(null);
      }
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(MEMBER_DATA_KEY);
        setMemberToken(null);
        setMember(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password?: string) => {
    try {
      const res = await api.portal.auth.login({ email, password });
      if (res.success && res.token && res.member) {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(MEMBER_DATA_KEY, JSON.stringify(res.member));
        setMemberToken(res.token);
        setMember(res.member);
        return {
          success: true,
          isFirstLogin: res.isFirstLogin,
          member: res.member,
        };
      }
      return { success: false, error: 'Login gagal.' };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Terjadi masalah saat menghubungkan ke server. Silakan coba lagi.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_DATA_KEY);
    setMemberToken(null);
    setMember(null);
  };

  const updateProfile = async (payload: Partial<Member> & { photo_number?: string; photoNumber?: string; customPhotoNumber?: string }) => {
    try {
      const res = await api.portal.profile.update(payload);
      const updated = res.member || res.data;
      if (res.success && updated) {
        setMember(updated);
        localStorage.setItem(MEMBER_DATA_KEY, JSON.stringify(updated));
        return { success: true, message: res.message };
      }
      return { success: false, error: 'Gagal memperbarui profil.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memperbarui profil.' };
    }
  };

  const requestVerificationCode = async (
    type: 'password' | 'email',
    options?: { currentPassword?: string; newEmail?: string }
  ) => {
    try {
      const res = await api.portal.auth.requestCode({
        type,
        purpose: type === 'password' ? 'change_password' : 'change_email',
        currentPassword: options?.currentPassword,
        newEmail: options?.newEmail,
        targetEmail: member?.email || undefined,
      });
      return {
        success: res.success,
        message: res.message,
        expiryMinutes: res.expiryMinutes,
        code: res.devVerificationCode || res.code,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengirim kode verifikasi.' };
    }
  };

  const changePassword = async (payload: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword?: string;
    code: string;
  }) => {
    try {
      const res = await api.portal.auth.changePassword(payload);
      return { success: res.success, message: res.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengubah password.' };
    }
  };

  const changeEmail = async (payload: { newEmail: string; code: string }) => {
    try {
      const res = await api.portal.auth.changeEmail(payload);
      if (res.success && res.member && res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(MEMBER_DATA_KEY, JSON.stringify(res.member));
        setMemberToken(res.token);
        setMember(res.member);
        return { success: true, message: res.message };
      }
      return { success: false, error: 'Gagal memperbarui email.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memperbarui email.' };
    }
  };

  return (
    <MemberAuthContext.Provider
      value={{
        member,
        memberToken,
        isAuthenticated: Boolean(member && memberToken),
        isLoading,
        login,
        logout,
        refreshProfile,
        updateProfile,
        changePassword,
        changeEmail,
        requestVerificationCode,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
};

export const useMemberAuth = () => {
  const context = useContext(MemberAuthContext);
  if (!context) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }
  return context;
};
