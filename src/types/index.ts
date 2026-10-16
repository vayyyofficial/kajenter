export interface Member {
  id: number;
  attendance_number?: number | null;
  full_name: string;
  nickname?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  email?: string | null;
  role: string;
  member_type: 'guru' | 'siswa';
  photo_number?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  event_identity: string;
  category: string;
  description: string;
  image_path: string;
  photos?: string[];
  images?: string[];
  event_date: string;
  created_by: string;
  dokumentator?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SocialMedia {
  id: number;
  platform: string;
  username: string;
  url: string;
  icon: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: number;
  user_name: string;
  action: string;
  entity_type: string;
  details: string;
  created_at: string;
}

export interface AdminMetrics {
  totalMembers: number;
  guruCount: number;
  siswaCount: number;
  galleryCount: number;
  socialCount: number;
  totalSocial: number;
}

export interface AdminSettingsData {
  settings: Record<string, string>;
  security: {
    lastPasswordChange: string | null;
    failedAttempts: number;
    isLocked: boolean;
    lockedUntil: string | null;
  };
}

export interface AdminStatusResponse {
  success: boolean;
  locked: boolean;
  remainingMs: number;
  attemptsRemaining?: number;
  message?: string;
  error?: string;
  attemptsLeft?: number;
}
