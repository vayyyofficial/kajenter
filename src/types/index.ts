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

export interface ClassKasRecord {
  id: number;
  member_id: number;
  memberId?: number;
  member_name?: string;
  member_attendance?: number;
  member_role?: string;
  year: number;
  week_number: number;
  weekNumber?: number;
  month_year?: string;
  monthYear?: string;
  amount: number;
  status?: string;
  is_paid: number | boolean;
  paid_date?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  recorded_by_name?: string | null;
  recorded_by_member_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClassKasWeek {
  id: number | string;
  week_number: number;
  weekNumber?: number;
  label: string;
  date_range?: string | null;
  dateRange?: string | null;
  year?: number;
  order_index?: number;
  orderIndex?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClassTask {
  id: number;
  title: string;
  subject: string;
  teacher_name?: string | null;
  description?: string | null;
  notes?: string | null;
  deadline_date: string;
  created_by_name?: string | null;
  created_by_member_id?: number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClassSchedule {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_name: string;
  room?: string | null;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface PiketSchedule {
  id: number;
  day_of_week: string;
  member_id?: number | null;
  member_name: string;
  tasks?: string | null;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClassKasExpense {
  id: number;
  expense_date: string;
  description: string;
  category: string;
  amount: number;
  recorded_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthMember extends Member {
  first_login?: number;
  last_login?: string | null;
  permissions?: {
    canManageKas: boolean;
    canManageExpenses?: boolean;
    canManageTasks: boolean;
    canManageSchedules: boolean;
    canManagePiket: boolean;
    canManageUsers: boolean;
    isDeveloper: boolean;
  };
}

export interface StoryMusic {
  title: string;
  artist: string;
  url?: string | null;
}

export interface MemberStory {
  id: number;
  member_id: number;
  media_url: string;
  caption?: string | null;
  raw_caption?: string | null;
  music?: StoryMusic | null;
  music_title?: string | null;
  music_artist?: string | null;
  music_url?: string | null;
  expiration_type: '24h' | 'custom' | 'lifetime';
  expires_at?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  member_name?: string;
  member_nickname?: string;
  member_role?: string;
  member_photo?: string;
}

export interface ActivityLog {
  id: number;
  user_name: string;
  action: string;
  entity_type: string;
  created_at: string;
  wib_date: string;
  wib_time: string;
  wib_full: string;
  wib_short: string;
  message: string;
  role: string;
  identifier: string;
  target: string;
  status: 'SUCCESS' | 'FAILED' | 'INFO';
  device?: string;
}


