import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!CONFIG.IS_SUPABASE_CONFIGURED) {
    return null;
  }

  if (!supabaseInstance) {
    const key = CONFIG.SUPABASE_SERVICE_ROLE_KEY || CONFIG.SUPABASE_ANON_KEY;
    supabaseInstance = createClient(CONFIG.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}

export const supabaseDb = {
  // ==========================================
  // GALLERY
  // ==========================================
  gallery: {
    async getAll(category?: string) {
      const client = getSupabaseClient()!;
      let query = client.from('gallery').select('*').order('event_date', { ascending: false }).order('id', { ascending: false });
      if (category && category !== 'Semua') {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    },

    async getById(id: number | string) {
      const client = getSupabaseClient()!;
      const { data, error } = await client.from('gallery').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async create(item: {
      title: string;
      eventIdentity: string;
      category: string;
      description: string;
      imagePath: string;
      eventDate: string;
      createdBy: string;
    }) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('gallery')
        .insert({
          title: item.title,
          event_identity: item.eventIdentity,
          category: item.category || 'Kegiatan',
          description: item.description,
          image_path: item.imagePath,
          event_date: item.eventDate,
          created_by: item.createdBy,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async update(
      id: number | string,
      item: {
        title?: string;
        eventIdentity?: string;
        category?: string;
        description?: string;
        imagePath?: string;
        eventDate?: string;
      }
    ) {
      const client = getSupabaseClient()!;
      const existing = await this.getById(id);
      if (!existing) throw new Error('Foto tidak ditemukan.');

      const now = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        updated_at: now,
      };

      if (item.title !== undefined) updatePayload.title = item.title;
      if (item.eventIdentity !== undefined) updatePayload.event_identity = item.eventIdentity;
      if (item.category !== undefined) updatePayload.category = item.category;
      if (item.description !== undefined) updatePayload.description = item.description;
      if (item.imagePath !== undefined) updatePayload.image_path = item.imagePath;
      if (item.eventDate !== undefined) updatePayload.event_date = item.eventDate;

      const { data, error } = await client
        .from('gallery')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async delete(id: number | string) {
      const client = getSupabaseClient()!;
      const existing = await this.getById(id);
      if (!existing) throw new Error('Foto tidak ditemukan.');

      const { error } = await client.from('gallery').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return existing;
    },
  },

  // ==========================================
  // MEMBERS
  // ==========================================
  members: {
    async getAll() {
      const client = getSupabaseClient()!;
      const { data: guru, error: errGuru } = await client
        .from('members')
        .select('*')
        .eq('member_type', 'guru')
        .order('id', { ascending: true });

      if (errGuru) throw new Error(errGuru.message);

      const { data: siswa, error: errSiswa } = await client
        .from('members')
        .select('*')
        .eq('member_type', 'siswa')
        .order('attendance_number', { ascending: true })
        .order('full_name', { ascending: true });

      if (errSiswa) throw new Error(errSiswa.message);

      const g = guru || [];
      const s = siswa || [];

      return {
        guru: g,
        siswa: s,
        totalGuru: g.length,
        totalSiswa: s.length,
        totalMembers: g.length + s.length,
      };
    },

    async getById(id: number | string) {
      const client = getSupabaseClient()!;
      const { data, error } = await client.from('members').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async getGuruCount(): Promise<number> {
      const client = getSupabaseClient()!;
      const { count, error } = await client
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('member_type', 'guru');
      if (error) throw new Error(error.message);
      return count || 0;
    },

    async checkDuplicateAttendance(attNum: number, excludeId?: number | string) {
      const client = getSupabaseClient()!;
      let query = client
        .from('members')
        .select('id')
        .eq('attendance_number', attNum)
        .eq('member_type', 'siswa');

      if (excludeId !== undefined) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      return Boolean(data);
    },

    async create(item: {
      attendanceNumber: number | null;
      fullName: string;
      nickname?: string | null;
      birthPlace?: string | null;
      birthDate?: string | null;
      email?: string | null;
      role: string;
      memberType: string;
      photoNumber?: string | null;
      phone?: string | null;
    }) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('members')
        .insert({
          attendance_number: item.attendanceNumber,
          full_name: item.fullName,
          nickname: item.nickname || null,
          birth_place: item.birthPlace || null,
          birth_date: item.birthDate || null,
          email: item.email || null,
          role: item.role,
          member_type: item.memberType,
          photo_number: item.photoNumber || null,
          phone: item.phone || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async update(
      id: number | string,
      item: {
        attendanceNumber?: number | null;
        fullName?: string;
        nickname?: string | null;
        birthPlace?: string | null;
        birthDate?: string | null;
        email?: string | null;
        role?: string;
        memberType?: string;
        photoNumber?: string | null;
        phone?: string | null;
      }
    ) {
      const client = getSupabaseClient()!;
      const existing = await this.getById(id);
      if (!existing) throw new Error('Anggota tidak ditemukan.');

      const now = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        updated_at: now,
      };

      if (item.fullName !== undefined) updatePayload.full_name = item.fullName;
      if (item.nickname !== undefined) updatePayload.nickname = item.nickname;
      if (item.birthPlace !== undefined) updatePayload.birth_place = item.birthPlace;
      if (item.birthDate !== undefined) updatePayload.birth_date = item.birthDate;
      if (item.email !== undefined) updatePayload.email = item.email;
      if (item.role !== undefined) updatePayload.role = item.role;
      if (item.memberType !== undefined) updatePayload.member_type = item.memberType;
      if (item.attendanceNumber !== undefined) updatePayload.attendance_number = item.attendanceNumber;
      if (item.photoNumber !== undefined) updatePayload.photo_number = item.photoNumber;
      if (item.phone !== undefined) updatePayload.phone = item.phone;

      const { data, error } = await client
        .from('members')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async delete(id: number | string) {
      const client = getSupabaseClient()!;
      const existing = await this.getById(id);
      if (!existing) throw new Error('Anggota tidak ditemukan.');

      const { error } = await client.from('members').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return existing;
    },
  },

  // ==========================================
  // SOCIAL MEDIA
  // ==========================================
  social: {
    async getActive() {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('social_media')
        .select('*')
        .eq('is_active', 1)
        .order('id', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },

    async getAll() {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('social_media')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },

    async getById(id: number | string) {
      const client = getSupabaseClient()!;
      const { data, error } = await client.from('social_media').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async create(item: { platform: string; username: string; url: string; icon?: string }) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('social_media')
        .insert({
          platform: item.platform,
          username: item.username,
          url: item.url,
          icon: item.icon || 'Globe',
          is_active: 1,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async update(id: number | string, item: { platform?: string; username?: string; url?: string; icon?: string; isActive?: boolean | number }) {
      const client = getSupabaseClient()!;
      const existing = await this.getById(id);
      if (!existing) throw new Error('Media sosial tidak ditemukan.');

      const now = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        updated_at: now,
      };

      if (item.platform !== undefined) updatePayload.platform = item.platform;
      if (item.username !== undefined) updatePayload.username = item.username;
      if (item.url !== undefined) updatePayload.url = item.url;
      if (item.icon !== undefined) updatePayload.icon = item.icon;
      if (item.isActive !== undefined) {
        updatePayload.is_active = item.isActive ? 1 : 0;
      }

      const { data, error } = await client
        .from('social_media')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    async delete(id: number | string) {
      const client = getSupabaseClient()!;
      const existing = await this.getById(id);
      if (!existing) throw new Error('Media sosial tidak ditemukan.');

      const { error } = await client.from('social_media').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return existing;
    },
  },

  // ==========================================
  // ADMIN & SETTINGS & AUDIT LOGS
  // ==========================================
  admin: {
    async getMetrics() {
      const client = getSupabaseClient()!;
      const [
        { count: guruCount },
        { count: siswaCount },
        { count: galleryCount },
        { count: socialCount },
        { count: totalSocial },
      ] = await Promise.all([
        client.from('members').select('*', { count: 'exact', head: true }).eq('member_type', 'guru'),
        client.from('members').select('*', { count: 'exact', head: true }).eq('member_type', 'siswa'),
        client.from('gallery').select('*', { count: 'exact', head: true }),
        client.from('social_media').select('*', { count: 'exact', head: true }).eq('is_active', 1),
        client.from('social_media').select('*', { count: 'exact', head: true }),
      ]);

      const gCount = guruCount || 0;
      const sCount = siswaCount || 0;

      return {
        totalMembers: gCount + sCount,
        guruCount: gCount,
        siswaCount: sCount,
        galleryCount: galleryCount || 0,
        socialCount: socialCount || 0,
        totalSocial: totalSocial || 0,
      };
    },

    async getSettings() {
      const client = getSupabaseClient()!;
      const { data: settingsRows, error: errSettings } = await client.from('website_settings').select('*');
      if (errSettings) throw new Error(errSettings.message);

      const settingsMap: Record<string, string> = {};
      for (const row of settingsRows || []) {
        settingsMap[row.key] = row.value;
      }

      const authState = await supabaseDb.auth.getAuthState();

      return {
        settings: settingsMap,
        security: {
          lastPasswordChange: authState?.last_password_change || null,
          failedAttempts: authState?.failed_attempts || 0,
          isLocked: authState?.locked_until ? new Date(authState.locked_until).getTime() > Date.now() : false,
          lockedUntil: authState?.locked_until || null,
        },
      };
    },

    async updateSetting(key: string, value: string, description?: string) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const { error } = await client.from('website_settings').upsert({
        key,
        value,
        description: description || null,
        updated_at: now,
      });
      if (error) throw new Error(error.message);
    },

    async getAuditLogs(limit = 50) {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('activity_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data || [];
    },

    async recordAuditLog(userName: string, action: string, entityType: string, details: string) {
      try {
        const client = getSupabaseClient();
        if (!client) return;
        const now = new Date().toISOString();
        await client.from('activity_logs').insert({
          user_name: userName,
          action,
          entity_type: entityType,
          details,
          created_at: now,
        });
      } catch (err) {
        console.error('Failed to record audit log to Supabase:', err);
      }
    },
  },

  // ==========================================
  // AUTH
  // ==========================================
  auth: {
    async getAuthState() {
      const client = getSupabaseClient()!;
      const { data, error } = await client
        .from('admin_auth_state')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('Could not query admin_auth_state:', error.message);
      }

      if (!data) {
        // Initialize default row with icptkj35
        const initialHash = await bcrypt.hash('icptkj35', 10);
        const now = new Date().toISOString();
        const { data: inserted, error: insertError } = await client
          .from('admin_auth_state')
          .upsert({
            id: 1,
            password_hash: initialHash,
            failed_attempts: 0,
            locked_until: null,
            last_failed_at: null,
            last_password_change: now,
            updated_at: now,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to initialize admin_auth_state in Supabase:', insertError);
        }
        return inserted || {
          id: 1,
          password_hash: initialHash,
          failed_attempts: 0,
          locked_until: null,
          last_failed_at: null,
          last_password_change: now,
          updated_at: now,
        };
      }

      return data;
    },

    async updateAuthState(fields: {
      passwordHash?: string;
      failedAttempts?: number;
      lockedUntil?: string | null;
      lastFailedAt?: string | null;
      lastPasswordChange?: string;
    }) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const payload: Record<string, any> = {
        updated_at: now,
      };

      if (fields.passwordHash !== undefined) payload.password_hash = fields.passwordHash;
      if (fields.failedAttempts !== undefined) payload.failed_attempts = fields.failedAttempts;
      if (fields.lockedUntil !== undefined) payload.locked_until = fields.lockedUntil;
      if (fields.lastFailedAt !== undefined) payload.last_failed_at = fields.lastFailedAt;
      if (fields.lastPasswordChange !== undefined) payload.last_password_change = fields.lastPasswordChange;

      const { data, error } = await client
        .from('admin_auth_state')
        .update(payload)
        .eq('id', 1)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async resetLockout() {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const { error } = await client
        .from('admin_auth_state')
        .update({
          failed_attempts: 0,
          locked_until: null,
          updated_at: now,
        })
        .eq('id', 1);
      if (error) throw new Error(error.message);
    },
  },
};

// ==========================================
// SUPABASE STORAGE UPLOADER
// ==========================================
export async function uploadToSupabaseStorage(
  fileBuffer: Buffer,
  filename: string,
  mimetype: string
): Promise<{ url: string; path: string }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const bucketName = CONFIG.STORAGE_BUCKET || 'uploads';

  // Ensure bucket exists
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucketName);
    if (!bucketExists) {
      await client.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
      });
    }
  } catch {
    // Continue even if listBuckets fails due to permission
  }

  const filePath = `uploads/${Date.now()}-${filename}`;

  const { error: uploadError } = await client.storage.from(bucketName).upload(filePath, fileBuffer, {
    contentType: mimetype,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Gagal mengunggah file ke Supabase Storage: ${uploadError.message}`);
  }

  const { data: publicUrlData } = client.storage.from(bucketName).getPublicUrl(filePath);

  return {
    url: publicUrlData.publicUrl,
    path: filePath,
  };
}
