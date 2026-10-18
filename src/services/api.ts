import {
  Member,
  GalleryItem,
  SocialMedia,
  ActivityLog,
  AdminMetrics,
  AdminSettingsData,
  AdminStatusResponse,
  ClassKasRecord,
  ClassTask,
  ClassSchedule,
  PiketSchedule,
  AuthMember
} from '../types';

const RAW_API_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') : '';
export const API_BASE = RAW_API_URL ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`) : '/api';

export class ApiError extends Error {
  code?: string;
  status: number;
  data?: any;
  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const adminToken = localStorage.getItem('x_icp_admin_token');
  const memberToken = localStorage.getItem('x_icp_member_token');
  const token = endpoint.startsWith('/portal') ? (memberToken || adminToken) : (adminToken || memberToken);
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (_err) {
    console.error(`[API Network Error] ${options.method || 'GET'} ${API_BASE}${endpoint}:`, _err);
    throw new ApiError('Terjadi masalah saat menghubungkan ke server. Silakan coba lagi.', 0, 'NETWORK_ERROR');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`[API Error Response] ${options.method || 'GET'} ${API_BASE}${endpoint} -> status ${res.status}:`, data);
    const errorMsg = data.error || data.message || (res.status >= 500
      ? 'Terjadi masalah saat menghubungkan ke server. Silakan coba lagi.'
      : 'Terjadi kesalahan pada server.');
    throw new ApiError(errorMsg, res.status, data.code, data);
  }

  return data;
}

export const api = {
  auth: {
    checkAdminStatus: () =>
      request<AdminStatusResponse>('/auth/admin-status'),
    verifyAdminPassword: (password: string) =>
      request<{ success: boolean; token?: string; message?: string; error?: string }>('/auth/admin-verify', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    checkAdminSession: () =>
      request<{ success: boolean; valid: boolean }>('/auth/admin-session'),
    changeAdminPassword: (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      request<{ success: boolean; message: string }>('/auth/admin-change-password', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  members: {
    getAll: () =>
      request<{
        success: boolean;
        data: {
          guru: Member[];
          siswa: Member[];
          totalGuru: number;
          totalSiswa: number;
          totalMembers: number;
        };
      }>('/members'),
    getById: (id: number | string) =>
      request<{ success: boolean; data: Member }>(`/members/${id}`),
    create: (payload: Partial<Member> & { attendanceNumber?: string; memberType: string; fullName: string; customPhotoNumber?: string }) =>
      request<{ success: boolean; message: string; data: { id: number; photoNumber: string } }>('/members', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number | string, payload: Partial<Member> & { attendanceNumber?: string; memberType?: string; fullName?: string; customPhotoNumber?: string }) =>
      request<{ success: boolean; message: string }>(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number | string) =>
      request<{ success: boolean; message: string }>(`/members/${id}`, {
        method: 'DELETE',
      }),
  },

  gallery: {
    getAll: (category?: string) => {
      const q = category && category !== 'Semua' ? `?category=${encodeURIComponent(category)}` : '';
      return request<{ success: boolean; data: GalleryItem[] }>(`/gallery${q}`);
    },
    getById: (id: number | string) =>
      request<{ success: boolean; data: GalleryItem }>(`/gallery/${id}`),
    create: (payload: {
      title: string;
      eventIdentity: string;
      category?: string;
      description: string;
      imagePath?: string;
      photos?: string[];
      eventDate: string;
      dokumentator?: string;
      createdBy?: string;
    }) =>
      request<{ success: boolean; message: string; data: { id: number } }>('/gallery', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      id: number | string,
      payload: Partial<GalleryItem> & {
        eventIdentity?: string;
        imagePath?: string;
        photos?: string[];
        eventDate?: string;
        dokumentator?: string;
        createdBy?: string;
      }
    ) =>
      request<{ success: boolean; message: string }>(`/gallery/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number | string) =>
      request<{ success: boolean; message: string }>(`/gallery/${id}`, {
        method: 'DELETE',
      }),
  },

  social: {
    getActive: () =>
      request<{ success: boolean; data: SocialMedia[] }>('/social'),
    getAll: () =>
      request<{ success: boolean; data: SocialMedia[] }>('/social/all'),
    create: (payload: { platform: string; username: string; url: string; icon?: string }) =>
      request<{ success: boolean; message: string; data: { id: number } }>('/social', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number | string, payload: Partial<SocialMedia> & { isActive?: boolean }) =>
      request<{ success: boolean; message: string }>(`/social/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number | string) =>
      request<{ success: boolean; message: string }>(`/social/${id}`, {
        method: 'DELETE',
      }),
  },

  admin: {
    getMetrics: () =>
      request<{ success: boolean; data: AdminMetrics }>('/admin/metrics'),
    getSettings: () =>
      request<{ success: boolean; data: AdminSettingsData }>('/admin/settings'),
    updateSettings: (payload: { className?: string; schoolProgram?: string; logoUrl?: string; classDescription?: string }) =>
      request<{ success: boolean; message: string }>('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    getAuditLogs: (limit = 50) =>
      request<{ success: boolean; data: ActivityLog[] }>(`/admin/audit-logs?limit=${limit}`),
  },

  upload: {
    image: (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return request<{
        success: boolean;
        message: string;
        data: { filename: string; url: string; size: number; mimetype: string };
      }>('/upload', {
        method: 'POST',
        body: formData,
      });
    },
    images: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });
      return request<{
        success: boolean;
        message: string;
        data: Array<{ filename: string; url: string; size: number; mimetype: string }>;
      }>('/upload/multiple', {
        method: 'POST',
        body: formData,
      });
    },
  },

  portal: {
    auth: {
      login: (payload: { email: string; password?: string }) =>
        request<{ success: boolean; token: string; member: AuthMember; isFirstLogin: boolean }>('/portal/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      getMe: () =>
        request<{ success: boolean; member: AuthMember }>('/portal/auth/me'),
      requestCode: (payload: { type: 'password' | 'email'; targetEmail?: string }) =>
        request<{ success: boolean; message: string; expiryMinutes: number }>('/portal/auth/request-code', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      changePassword: (payload: { currentPassword: string; newPassword: string; confirmPassword: string; code: string }) =>
        request<{ success: boolean; message: string }>('/portal/auth/change-password', {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
      changeEmail: (payload: { newEmail: string; code: string }) =>
        request<{ success: boolean; message: string; member: AuthMember; token: string }>('/portal/auth/change-email', {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
    },

    profile: {
      update: (payload: Partial<Member>) =>
        request<{ success: boolean; message: string; member: AuthMember }>('/portal/profile', {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
    },

    kas: {
      getAll: (params?: { year?: number; week?: number; member_id?: number }) => {
        const q = params
          ? '?' +
            new URLSearchParams(
              Object.entries(params)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])
            ).toString()
          : '';
        return request<{
          success: boolean;
          data: ClassKasRecord[];
          defaultAmount: number;
          summary: { totalMembers: number; paidCount: number; unpaidCount: number; totalAmount: number };
        }>(`/portal/kas${q}`);
      },
      record: (payload: {
        member_id: number;
        year: number;
        week_number: number;
        amount?: number;
        is_paid: boolean | number;
        notes?: string;
      }) =>
        request<{ success: boolean; message: string; data: ClassKasRecord }>('/portal/kas', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      delete: (id: number) =>
        request<{ success: boolean; message: string }>(`/portal/kas/${id}`, {
          method: 'DELETE',
        }),
    },

    tasks: {
      getAll: (params?: { month?: string; subject?: string }) => {
        const q = params
          ? '?' +
            new URLSearchParams(
              Object.entries(params)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])
            ).toString()
          : '';
        return request<{ success: boolean; data: ClassTask[]; deadlineDates: string[] }>(`/portal/tasks${q}`);
      },
      create: (payload: {
        title: string;
        subject: string;
        teacher_name?: string;
        description?: string;
        notes?: string;
        deadline_date: string;
        status?: string;
      }) =>
        request<{ success: boolean; message: string; data: ClassTask }>('/portal/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      update: (id: number, payload: Partial<ClassTask>) =>
        request<{ success: boolean; message: string; data: ClassTask }>(`/portal/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
      delete: (id: number) =>
        request<{ success: boolean; message: string }>(`/portal/tasks/${id}`, {
          method: 'DELETE',
        }),
      getDueTomorrow: () =>
        request<{
          success: boolean;
          tomorrowDate: string;
          count: number;
          tasks: ClassTask[];
        }>('/portal/tasks/due-tomorrow'),
    },

    schedules: {
      getAll: (day?: string) =>
        request<{ success: boolean; data: ClassSchedule[] }>(`/portal/schedules${day ? `?day=${encodeURIComponent(day)}` : ''}`),
      create: (payload: Partial<ClassSchedule>) =>
        request<{ success: boolean; message: string; data: ClassSchedule }>('/portal/schedules', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      update: (id: number, payload: Partial<ClassSchedule>) =>
        request<{ success: boolean; message: string; data: ClassSchedule }>(`/portal/schedules/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
      delete: (id: number) =>
        request<{ success: boolean; message: string }>(`/portal/schedules/${id}`, {
          method: 'DELETE',
        }),
    },

    piket: {
      getAll: (day?: string) =>
        request<{ success: boolean; data: PiketSchedule[] }>(`/portal/piket${day ? `?day=${encodeURIComponent(day)}` : ''}`),
      create: (payload: Partial<PiketSchedule>) =>
        request<{ success: boolean; message: string; data: PiketSchedule }>('/portal/piket', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      update: (id: number, payload: Partial<PiketSchedule>) =>
        request<{ success: boolean; message: string; data: PiketSchedule }>(`/portal/piket/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
      delete: (id: number) =>
        request<{ success: boolean; message: string }>(`/portal/piket/${id}`, {
          method: 'DELETE',
        }),
    },

    users: {
      getAll: () =>
        request<{ success: boolean; data: any[] }>('/portal/users'),
      updateRole: (id: number, role: string) =>
        request<{ success: boolean; message: string; data: any }>(`/portal/users/${id}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role }),
        }),
    },
  },
};
