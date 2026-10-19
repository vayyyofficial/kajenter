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

export function parseGalleryImages(imagePath: string | null | undefined): string[] {
  if (!imagePath) return [];
  const trimmed = imagePath.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((p) => typeof p === 'string' && p.trim().length > 0);
      }
    } catch {
      // fallback
    }
  }
  if (trimmed.includes('\n')) {
    const list = trimmed.split('\n').map((s) => s.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return [trimmed];
}

export function formatGalleryItem(item: any) {
  if (!item) return item;
  const photos = parseGalleryImages(item.image_path);
  const primaryImage = photos[0] || item.image_path || '';
  return {
    ...item,
    image_path: primaryImage,
    photos: photos.length > 0 ? photos : (primaryImage ? [primaryImage] : []),
    images: photos.length > 0 ? photos : (primaryImage ? [primaryImage] : []),
  };
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
      return (data || []).map(formatGalleryItem);
    },

    async getById(id: number | string) {
      const client = getSupabaseClient()!;
      const { data, error } = await client.from('gallery').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? formatGalleryItem(data) : null;
    },

    async create(item: {
      title: string;
      eventIdentity: string;
      category: string;
      description: string;
      imagePath?: string;
      photos?: string[];
      eventDate: string;
      createdBy: string;
    }) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();

      let finalImagePath = (item.imagePath || '').trim();
      if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
        const cleanPhotos = item.photos.filter((p) => typeof p === 'string' && p.trim().length > 0);
        if (cleanPhotos.length === 1) {
          finalImagePath = cleanPhotos[0];
        } else if (cleanPhotos.length > 1) {
          finalImagePath = JSON.stringify(cleanPhotos);
        }
      }

      const { data, error } = await client
        .from('gallery')
        .insert({
          title: item.title,
          event_identity: item.eventIdentity,
          category: item.category || 'Kegiatan',
          description: item.description,
          image_path: finalImagePath,
          event_date: item.eventDate,
          created_by: item.createdBy,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return formatGalleryItem(data);
    },

    async update(
      id: number | string,
      item: {
        title?: string;
        eventIdentity?: string;
        category?: string;
        description?: string;
        imagePath?: string;
        photos?: string[];
        eventDate?: string;
        createdBy?: string;
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

      if (item.photos && Array.isArray(item.photos)) {
        const cleanPhotos = item.photos.filter((p) => typeof p === 'string' && p.trim().length > 0);
        if (cleanPhotos.length === 1) {
          updatePayload.image_path = cleanPhotos[0];
        } else if (cleanPhotos.length > 1) {
          updatePayload.image_path = JSON.stringify(cleanPhotos);
        } else if (item.imagePath !== undefined) {
          updatePayload.image_path = item.imagePath;
        }
      } else if (item.imagePath !== undefined) {
        updatePayload.image_path = item.imagePath;
      }

      if (item.eventDate !== undefined) updatePayload.event_date = item.eventDate;
      if (item.createdBy !== undefined) updatePayload.created_by = item.createdBy;

      const { data, error } = await client
        .from('gallery')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return formatGalleryItem(data);
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

  // ==========================================
  // PORTAL AUTH & ACCOUNTS
  // ==========================================
  portalAuth: {
    async findMemberByEmail(email: string) {
      const client = getSupabaseClient();
      if (!client) return null;
      const cleanEmail = email.trim().toLowerCase();

      // 1. Direct case-insensitive lookup
      try {
        const { data, error } = await client
          .from('members')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (error) {
          console.warn('findMemberByEmail ilike warning:', error.message);
        }
        if (data) return data;
      } catch (err: any) {
        console.warn('findMemberByEmail ilike exception:', err.message);
      }

      // 2. Fallback: match trimmed lowercase in case of whitespace in DB
      try {
        const { data: allMembers, error: errAll } = await client.from('members').select('*');
        if (!errAll && allMembers && Array.isArray(allMembers)) {
          const found = allMembers.find(
            (m: any) => m.email && String(m.email).trim().toLowerCase() === cleanEmail
          );
          if (found) return found;
        }
      } catch (err: any) {
        console.warn('findMemberByEmail allMembers fallback warning:', err.message);
      }

      // 3. Safe Additive Ensure for Fairuzzi Achmad (Absen 02, Developer) if missing in remote Supabase
      if (cleanEmail === 'fairuzziachmad@gmail.com') {
        try {
          const now = new Date().toISOString();
          const { data: inserted, error: insErr } = await client
            .from('members')
            .insert({
              attendance_number: 2,
              full_name: 'Fairuzzi Achmad',
              nickname: 'Fairuz',
              email: 'fairuzziachmad@gmail.com',
              role: 'Developer',
              member_type: 'siswa',
              bio: 'Fullstack Developer & Student of X ICP TKJ',
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

          if (!insErr && inserted) {
            console.log('Auto-ensured Fairuzzi Achmad member record in Supabase.');
            return inserted;
          }
        } catch {
          // Safe ignore if fails
        }
      }

      return null;
    },

    async getAccountByMemberId(memberId: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data, error } = await client
          .from('member_accounts')
          .select('*')
          .eq('member_id', memberId)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          console.warn('getAccountByMemberId error:', error.message);
        }
        return data || null;
      } catch (err: any) {
        console.warn('getAccountByMemberId exception:', err.message);
        return null;
      }
    },

    async getAccountByEmail(email: string) {
      const client = getSupabaseClient();
      if (!client) return null;
      const cleanEmail = email.trim().toLowerCase();
      try {
        const { data, error } = await client
          .from('member_accounts')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          console.warn('getAccountByEmail error:', error.message);
        }
        return data || null;
      } catch (err: any) {
        console.warn('getAccountByEmail exception:', err.message);
        return null;
      }
    },

    async createAccount(memberId: number | string, email: string, passwordHash: string) {
      const client = getSupabaseClient();
      const now = new Date().toISOString();
      const cleanEmail = email.trim().toLowerCase();
      if (!client) {
        return {
          id: memberId,
          member_id: memberId,
          email: cleanEmail,
          password_hash: passwordHash,
          has_changed_password: 0,
          created_at: now,
          updated_at: now,
        };
      }

      try {
        const { data, error } = await client
          .from('member_accounts')
          .insert({
            member_id: memberId,
            email: cleanEmail,
            password_hash: passwordHash,
            has_changed_password: 0,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (error) {
          console.warn('portalAuth.createAccount insert warning (RLS or table):', error.message);
          return {
            id: memberId,
            member_id: memberId,
            email: cleanEmail,
            password_hash: passwordHash,
            has_changed_password: 0,
            created_at: now,
            updated_at: now,
          };
        }
        return data;
      } catch (err: any) {
        console.warn('portalAuth.createAccount exception:', err.message);
        return {
          id: memberId,
          member_id: memberId,
          email: cleanEmail,
          password_hash: passwordHash,
          has_changed_password: 0,
          created_at: now,
          updated_at: now,
        };
      }
    },

    async updatePassword(memberId: number | string, passwordHash: string) {
      const client = getSupabaseClient();
      const now = new Date().toISOString();
      if (!client) return null;

      try {
        const { data, error } = await client
          .from('member_accounts')
          .update({
            password_hash: passwordHash,
            has_changed_password: 1,
            updated_at: now,
          })
          .eq('member_id', memberId)
          .select()
          .maybeSingle();

        if (error) {
          console.warn('portalAuth.updatePassword warning:', error.message);
        }
        return data;
      } catch (err: any) {
        console.warn('portalAuth.updatePassword exception:', err.message);
        return null;
      }
    },

    async updateEmail(memberId: number | string, newEmail: string) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const cleanEmail = newEmail.trim().toLowerCase();

      await client.from('members').update({ email: cleanEmail, updated_at: now }).eq('id', memberId);
      await client.from('member_accounts').update({ email: cleanEmail, updated_at: now }).eq('member_id', memberId);

      return this.findMemberByEmail(cleanEmail);
    },

    async saveVerificationCode(email: string, code: string, purpose: string, newEmail?: string) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error } = await client.from('verification_codes').insert({
        email: email.trim().toLowerCase(),
        code,
        purpose,
        new_email: newEmail ? newEmail.trim().toLowerCase() : null,
        expires_at: expiresAt,
        used: 0,
        created_at: now,
      });
      if (error) console.warn('saveVerificationCode warning:', error.message);
    },

    async verifyCode(email: string, code: string, purpose: string) {
      const client = getSupabaseClient()!;
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('verification_codes')
        .select('*')
        .ilike('email', email.trim().toLowerCase())
        .eq('code', code.trim())
        .eq('purpose', purpose)
        .eq('used', 0)
        .gt('expires_at', now)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      await client.from('verification_codes').update({ used: 1 }).eq('id', data.id);
      return data;
    },
  },

  // ==========================================
  // KAS MINGGUAN
  // ==========================================
  kas: {
    async getAll(monthYear?: string) {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        let query = client
          .from('class_kas_records')
          .select('*, members(full_name, attendance_number, role)');

        if (monthYear) {
          query = String(monthYear).trim().length === 4
            ? query.like('month_year', `${String(monthYear).trim()}%`)
            : query.eq('month_year', String(monthYear).trim());
        }
        let { data, error } = await query
          .order('month_year', { ascending: false })
          .order('week_number', { ascending: true });

        // Fallback: If foreign key relation isn't defined in PostgREST, query flat and join manually
        if (error && error.message && (error.message.includes('relationship') || error.message.includes('members'))) {
          console.warn('kas.getAll fallback to flat query due to relationship:', error.message);
          let flatQuery = client.from('class_kas_records').select('*');
          if (monthYear) {
            flatQuery = String(monthYear).trim().length === 4
              ? flatQuery.like('month_year', `${String(monthYear).trim()}%`)
              : flatQuery.eq('month_year', String(monthYear).trim());
          }
          const flatRes = await flatQuery
            .order('month_year', { ascending: false })
            .order('week_number', { ascending: true });
          data = flatRes.data;
          error = flatRes.error;
        }

        if (error) {
          console.warn('kas.getAll Supabase warning (tabel mungkin belum dibuat):', error.message);
          return [];
        }

        if (!data || data.length === 0) return [];

        const hasJoinedMembers = Boolean(data[0]?.members);
        let membersMap: Record<string, any> = {};
        if (!hasJoinedMembers) {
          const { data: mems } = await client.from('members').select('id, full_name, attendance_number, role');
          (mems || []).forEach((m: any) => {
            membersMap[String(m.id)] = m;
          });
        }

        return data.map((row: any) => {
          const mem = row.members || membersMap[String(row.member_id)] || {};
          return {
            ...row,
            full_name: mem.full_name || row.full_name || '',
            attendance_number: mem.attendance_number ?? row.attendance_number ?? null,
            role: mem.role || row.role || '',
          };
        });
      } catch (err: any) {
        console.warn('kas.getAll exception:', err.message);
        return [];
      }
    },

    async getByMember(memberId: number | string) {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const { data, error } = await client
          .from('class_kas_records')
          .select('*')
          .eq('member_id', memberId)
          .order('month_year', { ascending: false })
          .order('week_number', { ascending: true });
        if (error) {
          console.warn('kas.getByMember error:', error.message);
          return [];
        }
        return data || [];
      } catch (err: any) {
        console.warn('kas.getByMember exception:', err.message);
        return [];
      }
    },

    async recordPayment(item: {
      memberId: number | string;
      weekNumber: number;
      monthYear: string;
      amount?: number;
      status?: string;
      recordedBy: string;
      notes?: string;
    }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const amount = item.amount || 3000;
      const status = item.status || 'paid';
      const paidAt = status === 'paid' ? now : null;
      const memberIdNum = Number(item.memberId);
      const weekNum = Number(item.weekNumber);

      try {
        // Query safely without maybeSingle to prevent PGRST116 when multiple rows exist
        const { data: existingRows, error: existErr } = await client
          .from('class_kas_records')
          .select('*')
          .eq('member_id', memberIdNum)
          .eq('week_number', weekNum)
          .order('id', { ascending: false });

        if (existErr) {
          console.error('kas.recordPayment find existing error:', existErr);
          throw new Error(`Data pembayaran kas belum dapat diverifikasi: ${existErr.message}`);
        }

        const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

        if (existing) {
          const updatePayload: Record<string, any> = {
            amount,
            status,
            paid_at: paidAt,
            recorded_by: item.recordedBy || 'Bendahara',
            notes: item.notes || null,
            updated_at: now,
          };
          if (item.monthYear) {
            updatePayload.month_year = item.monthYear;
          }

          const { data, error } = await client
            .from('class_kas_records')
            .update(updatePayload)
            .eq('id', existing.id)
            .select();

          if (error) {
            console.error('kas.recordPayment update error:', error);
            throw new Error(`Data pembayaran kas belum dapat diperbarui: ${error.message}`);
          }
          return data && data[0] ? data[0] : { ...existing, ...updatePayload };
        } else {
          const insertPayload = {
            member_id: memberIdNum,
            week_number: weekNum,
            month_year: item.monthYear || String(new Date().getFullYear()),
            amount,
            status,
            paid_at: paidAt,
            recorded_by: item.recordedBy || 'Bendahara',
            notes: item.notes || null,
            created_at: now,
            updated_at: now,
          };

          const { data, error } = await client
            .from('class_kas_records')
            .insert(insertPayload)
            .select();

          if (error) {
            console.error('kas.recordPayment insert error:', error);
            throw new Error(`Data pembayaran kas belum dapat disimpan: ${error.message}`);
          }
          return data && data[0] ? data[0] : { id: Date.now(), ...insertPayload };
        }
      } catch (err: any) {
        console.error('kas.recordPayment exception:', err);
        throw new Error(err.message || 'Data pembayaran kas belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async deletePayment(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client.from('class_kas_records').select('*').eq('id', id).maybeSingle();
        await client.from('class_kas_records').delete().eq('id', id);
        return data;
      } catch (err: any) {
        console.warn('kas.deletePayment exception:', err.message);
        return null;
      }
    },

    async getSummary() {
      const client = getSupabaseClient();
      if (!client) {
        return { initialBalance: 0, totalCollected: 0, totalIncome: 0, totalExpenses: 0, netBalance: 0, weeklyNominal: 3000 };
      }
      try {
        const { data: recordsData } = await client.from('class_kas_records').select('amount').eq('status', 'paid');
        const totalIncome = (recordsData || []).reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);

        let totalExpenses = 0;
        try {
          const { data: expensesData } = await client.from('class_kas_expenses').select('amount');
          totalExpenses = (expensesData || []).reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
        } catch {
          totalExpenses = 0;
        }

        const { data: nominalRow } = await client.from('website_settings').select('value').eq('key', 'kas_nominal').maybeSingle();
        const { data: initialBalanceRow } = await client.from('website_settings').select('value').eq('key', 'kas_initial_balance').maybeSingle();
        const initialBalance = initialBalanceRow?.value ? parseInt(initialBalanceRow.value, 10) : 0;

        return {
          initialBalance,
          totalCollected: totalIncome,
          totalIncome,
          totalExpenses,
          netBalance: initialBalance + totalIncome - totalExpenses,
          weeklyNominal: nominalRow?.value ? parseInt(nominalRow.value, 10) : 3000,
        };
      } catch (err: any) {
        console.warn('kas.getSummary exception:', err.message);
        return { initialBalance: 0, totalCollected: 0, totalIncome: 0, totalExpenses: 0, netBalance: 0, weeklyNominal: 3000 };
      }
    },
  },

  // ==========================================
  // KAS WEEKS (MINGGUAN KAS)
  // ==========================================
  kasWeeks: {
    async getAll(year?: number) {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        let query = client.from('class_kas_weeks').select('*');
        if (year) {
          query = query.eq('year', year);
        }
        const { data, error } = await query
          .order('order_index', { ascending: true })
          .order('week_number', { ascending: true });
        if (error) {
          console.warn('kasWeeks.getAll warning:', error.message);
          return [];
        }
        return data || [];
      } catch (err: any) {
        console.warn('kasWeeks.getAll exception:', err.message);
        return [];
      }
    },

    async getById(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data, error } = await client.from('class_kas_weeks').select('*').eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      } catch (err: any) {
        console.warn('kasWeeks.getById exception:', err.message);
        return null;
      }
    },

    async getByWeekNumber(weekNumber: number, year?: number) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client
          .from('class_kas_weeks')
          .select('*')
          .eq('week_number', weekNumber)
          .eq('year', year || 2026)
          .maybeSingle();
        return data;
      } catch {
        return null;
      }
    },

    async create(item: { weekNumber: number; label: string; dateRange: string; year?: number; orderIndex?: number }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const year = item.year || 2026;
      const orderIndex = item.orderIndex !== undefined ? item.orderIndex : item.weekNumber;
      try {
        const { data, error } = await client
          .from('class_kas_weeks')
          .insert({
            week_number: item.weekNumber,
            label: item.label.trim(),
            date_range: item.dateRange.trim(),
            year,
            order_index: orderIndex,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (error) {
          console.error('kas_weeks.create Supabase error:', error);
          throw new Error('Data periode kas belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
        }
        return data;
      } catch (err: any) {
        console.error('kas_weeks.create exception:', err);
        throw new Error(err.message?.includes('belum dapat') ? err.message : 'Data periode kas belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async update(id: number | string, item: { label?: string; dateRange?: string; weekNumber?: number; orderIndex?: number }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const payload: Record<string, any> = { updated_at: now };
      if (item.label !== undefined) payload.label = item.label.trim();
      if (item.dateRange !== undefined) payload.date_range = item.dateRange.trim();
      if (item.weekNumber !== undefined) payload.week_number = item.weekNumber;
      if (item.orderIndex !== undefined) payload.order_index = item.orderIndex;

      try {
        const { data, error } = await client.from('class_kas_weeks').update(payload).eq('id', id).select().single();
        if (error) {
          console.error('kas_weeks.update Supabase error:', error);
          throw new Error('Data periode kas belum dapat diperbarui ke server. Silakan coba beberapa saat lagi.');
        }
        return data;
      } catch (err: any) {
        console.error('kas_weeks.update exception:', err);
        throw new Error(err.message?.includes('belum dapat') ? err.message : 'Data periode kas belum dapat diperbarui ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async delete(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client.from('class_kas_weeks').select('*').eq('id', id).maybeSingle();
        await client.from('class_kas_weeks').delete().eq('id', id);
        return data;
      } catch (err: any) {
        console.warn('kasWeeks.delete exception:', err.message);
        return null;
      }
    },
  },

  // ==========================================
  // PENGELUARAN KAS (EXPENSES - Requirement #4 & #5)
  // ==========================================
  kasExpenses: {
    async getAll() {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const { data, error } = await client
          .from('class_kas_expenses')
          .select('*')
          .order('expense_date', { ascending: false })
          .order('id', { ascending: false });

        if (error) {
          console.warn('kasExpenses.getAll error:', error.message);
          return [];
        }
        return data || [];
      } catch (err: any) {
        console.warn('kasExpenses.getAll exception:', err.message);
        return [];
      }
    },

    async getById(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data, error } = await client
          .from('class_kas_expenses')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (err: any) {
        console.warn('kasExpenses.getById exception:', err.message);
        return null;
      }
    },

    async create(item: {
      expense_date?: string;
      description: string;
      category?: string;
      amount: number;
      recorded_by?: string;
      notes?: string;
    }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Database Supabase tidak terkonfigurasi.');

      const now = new Date().toISOString();
      const expenseDate = item.expense_date || now.split('T')[0];

      const payload = {
        expense_date: expenseDate,
        description: item.description.trim(),
        category: item.category || 'Lain-lain',
        amount: Number(item.amount),
        recorded_by: item.recorded_by || 'Bendahara',
        notes: item.notes || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await client
        .from('class_kas_expenses')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('kasExpenses.create error:', error);
        throw new Error(error.message || 'Gagal menyimpan pengeluaran kas.');
      }
      return data;
    },

    async update(
      id: number | string,
      item: {
        expense_date?: string;
        description?: string;
        category?: string;
        amount?: number;
        recorded_by?: string;
        notes?: string;
      }
    ) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Database Supabase tidak terkonfigurasi.');

      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (item.expense_date !== undefined) payload.expense_date = item.expense_date;
      if (item.description !== undefined) payload.description = item.description.trim();
      if (item.category !== undefined) payload.category = item.category;
      if (item.amount !== undefined) payload.amount = Number(item.amount);
      if (item.recorded_by !== undefined) payload.recorded_by = item.recorded_by;
      if (item.notes !== undefined) payload.notes = item.notes;

      const { data, error } = await client
        .from('class_kas_expenses')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('kasExpenses.update error:', error);
        throw new Error(error.message || 'Gagal memperbarui pengeluaran kas.');
      }
      return data;
    },

    async delete(id: number | string) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Database Supabase tidak terkonfigurasi.');

      const { data: existing } = await client
        .from('class_kas_expenses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const { error } = await client
        .from('class_kas_expenses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('kasExpenses.delete error:', error);
        throw new Error(error.message || 'Gagal menghapus pengeluaran kas.');
      }
      return existing;
    },

    async getTotalExpenses() {
      const client = getSupabaseClient();
      if (!client) return 0;
      try {
        const { data } = await client.from('class_kas_expenses').select('amount');
        return (data || []).reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
      } catch {
        return 0;
      }
    },
  },

  // ==========================================
  // TUGAS
  // ==========================================
  tasks: {
    async getAll() {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const { data, error } = await client.from('class_tasks').select('*').order('deadline', { ascending: true });
        if (error) {
          console.warn('tasks.getAll error:', error.message);
          return [];
        }
        return data || [];
      } catch (err: any) {
        console.warn('tasks.getAll exception:', err.message);
        return [];
      }
    },

    async getById(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      const { data, error } = await client.from('class_tasks').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async create(item: {
      title: string;
      subject: string;
      teacherName?: string;
      deadline: string;
      description?: string;
      notes?: string;
      status?: string;
      createdBy?: string;
    }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const basePayload: Record<string, any> = {
        title: item.title.trim(),
        subject: item.subject.trim(),
        teacher_name: item.teacherName?.trim() || null,
        deadline: item.deadline.trim(),
        description: item.description?.trim() || null,
        notes: item.notes?.trim() || null,
        created_by: item.createdBy || 'Sekretaris',
        created_at: now,
        updated_at: now,
      };

      try {
        // Attempt insert with status column first
        const payloadWithStatus = {
          ...basePayload,
          status: item.status || 'pending',
        };

        let { data, error } = await client
          .from('class_tasks')
          .insert(payloadWithStatus)
          .select();

        // If error indicates 'status' column doesn't exist, gracefully fallback without status column
        if (error && error.message && error.message.toLowerCase().includes('status')) {
          console.warn('class_tasks has no status column, retrying without status column:', error.message);
          const fallbackRes = await client
            .from('class_tasks')
            .insert(basePayload)
            .select();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (error) {
          console.error('tasks.create Supabase error:', error);
          throw new Error(`Data tugas belum dapat disimpan: ${error.message}`);
        }
        return data && data[0] ? data[0] : { id: Date.now(), ...payloadWithStatus };
      } catch (err: any) {
        console.error('tasks.create exception:', err);
        throw new Error(err.message || 'Data tugas belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async update(id: number | string, item: Partial<any>) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const payload: Record<string, any> = { updated_at: now };
      if (item.title !== undefined) payload.title = item.title.trim();
      if (item.subject !== undefined) payload.subject = item.subject.trim();
      if (item.teacherName !== undefined) payload.teacher_name = item.teacherName?.trim() || null;
      if (item.teacher_name !== undefined) payload.teacher_name = item.teacher_name?.trim() || null;
      if (item.deadline !== undefined) payload.deadline = item.deadline.trim();
      if (item.deadline_date !== undefined) payload.deadline = item.deadline_date.trim();
      if (item.description !== undefined) payload.description = item.description?.trim() || null;
      if (item.notes !== undefined) payload.notes = item.notes?.trim() || null;
      if (item.status !== undefined) payload.status = item.status;

      try {
        let { data, error } = await client.from('class_tasks').update(payload).eq('id', id).select();

        // If status column doesn't exist in existing schema, retry update without status
        if (error && error.message && error.message.toLowerCase().includes('status')) {
          const { status: _s, ...payloadWithoutStatus } = payload;
          const retryRes = await client.from('class_tasks').update(payloadWithoutStatus).eq('id', id).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('tasks.update Supabase error:', error);
          throw new Error(`Data tugas belum dapat diperbarui: ${error.message}`);
        }
        return data && data[0] ? data[0] : { id, ...payload };
      } catch (err: any) {
        console.error('tasks.update exception:', err);
        throw new Error(err.message || 'Data tugas belum dapat diperbarui ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async delete(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client.from('class_tasks').select('*').eq('id', id);
        const existing = data && data[0] ? data[0] : null;
        await client.from('class_tasks').delete().eq('id', id);
        return existing;
      } catch (err: any) {
        console.error('tasks.delete exception:', err);
        return null;
      }
    },
  },

  // ==========================================
  // JADWAL PELAJARAN
  // ==========================================
  schedules: {
    async getAll() {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const { data, error } = await client
          .from('class_schedules')
          .select('*')
          .order('order_index', { ascending: true })
          .order('start_time', { ascending: true });
        if (error) {
          console.warn('schedules.getAll error, trying without order_index:', error.message);
          const fallbackRes = await client.from('class_schedules').select('*').order('start_time', { ascending: true });
          return fallbackRes.data || [];
        }
        return data || [];
      } catch (err: any) {
        console.warn('schedules.getAll exception:', err.message);
        return [];
      }
    },

    async create(item: {
      day: string;
      startTime: string;
      endTime: string;
      subject: string;
      teacherName?: string;
      room?: string;
      orderIndex?: number;
    }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const cleanTeacher = (item.teacherName || '').trim();
      const payload: Record<string, any> = {
        day: item.day.trim(),
        start_time: item.startTime.trim(),
        end_time: item.endTime.trim(),
        subject: item.subject.trim(),
        teacher_name: cleanTeacher,
        created_at: now,
        updated_at: now,
      };

      if (item.orderIndex !== undefined) {
        payload.order_index = Number(item.orderIndex);
      }

      try {
        let { data, error } = await client
          .from('class_schedules')
          .insert(payload)
          .select();

        // If order_index column doesn't exist, retry without order_index
        if (error && error.message && error.message.toLowerCase().includes('order_index')) {
          console.warn('class_schedules has no order_index column, retrying without it:', error.message);
          const { order_index: _oi, ...payloadNoOrder } = payload;
          const retryRes = await client.from('class_schedules').insert(payloadNoOrder).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        // If room column has NOT NULL constraint in older schema, retry with room: ''
        if (error && error.message && error.message.toLowerCase().includes('room')) {
          console.warn('class_schedules room not-null constraint hit, retrying with empty room string:', error.message);
          payload.room = '';
          const retryRes = await client.from('class_schedules').insert(payload).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('schedules.create Supabase error:', error);
          throw new Error(`Jadwal pelajaran belum dapat disimpan: ${error.message}`);
        }
        return data && data[0] ? data[0] : { id: Date.now(), ...payload };
      } catch (err: any) {
        console.error('schedules.create exception:', err);
        throw new Error(err.message || 'Jadwal pelajaran belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async update(id: number | string, item: Partial<any>) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const payload: Record<string, any> = { updated_at: now };
      if (item.day !== undefined) payload.day = item.day.trim();
      if (item.startTime !== undefined) payload.start_time = item.startTime.trim();
      if (item.start_time !== undefined) payload.start_time = item.start_time.trim();
      if (item.endTime !== undefined) payload.end_time = item.endTime.trim();
      if (item.end_time !== undefined) payload.end_time = item.end_time.trim();
      if (item.subject !== undefined) payload.subject = item.subject.trim();
      if (item.teacherName !== undefined) payload.teacher_name = item.teacherName.trim();
      if (item.teacher_name !== undefined) payload.teacher_name = item.teacher_name.trim();
      if (item.orderIndex !== undefined) payload.order_index = item.orderIndex;
      if (item.order_index !== undefined) payload.order_index = item.order_index;

      try {
        let { data, error } = await client.from('class_schedules').update(payload).eq('id', id).select();

        if (error && error.message && error.message.toLowerCase().includes('order_index')) {
          const { order_index: _oi, ...payloadNoOrder } = payload;
          const retryRes = await client.from('class_schedules').update(payloadNoOrder).eq('id', id).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('schedules.update Supabase error:', error);
          throw new Error(`Jadwal pelajaran belum dapat diperbarui: ${error.message}`);
        }
        return data && data[0] ? data[0] : { id, ...payload };
      } catch (err: any) {
        console.error('schedules.update exception:', err);
        throw new Error(err.message || 'Jadwal pelajaran belum dapat diperbarui ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async delete(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client.from('class_schedules').select('*').eq('id', id);
        const existing = data && data[0] ? data[0] : null;
        await client.from('class_schedules').delete().eq('id', id);
        return existing;
      } catch (err: any) {
        console.warn('schedules.delete exception:', err.message);
        return null;
      }
    },
  },

  // ==========================================
  // JADWAL PIKET
  // ==========================================
  piket: {
    async getAll() {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const { data, error } = await client.from('piket_schedules').select('*').order('id', { ascending: true });
        if (error) {
          console.warn('piket.getAll error:', error.message);
          return [];
        }
        return data || [];
      } catch (err: any) {
        console.warn('piket.getAll exception:', err.message);
        return [];
      }
    },

    async create(item: {
      day: string;
      memberId?: number | null;
      memberName: string;
      tasks?: string;
    }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const payload: Record<string, any> = {
        day: item.day.trim(),
        member_id: item.memberId ? Number(item.memberId) : null,
        member_name: item.memberName.trim(),
        tasks: item.tasks || 'Piket Kebersihan Kelas',
        created_at: now,
        updated_at: now,
      };

      try {
        let { data, error } = await client
          .from('piket_schedules')
          .insert(payload)
          .select();

        // If member_id foreign key constraint fails, retry with member_id = null
        if (error && error.message && (error.message.toLowerCase().includes('foreign') || error.message.toLowerCase().includes('violates foreign key'))) {
          console.warn('piket.create foreign key hit, retrying with member_id null:', error.message);
          payload.member_id = null;
          const retryRes = await client.from('piket_schedules').insert(payload).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('piket.create Supabase error:', error);
          throw new Error(`Jadwal piket belum dapat disimpan: ${error.message}`);
        }
        return data && data[0] ? data[0] : { id: Date.now(), ...payload };
      } catch (err: any) {
        console.error('piket.create exception:', err);
        throw new Error(err.message || 'Jadwal piket belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async update(id: number | string, item: Partial<any>) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const payload: Record<string, any> = { updated_at: now };
      if (item.day !== undefined) payload.day = item.day.trim();
      if (item.day_of_week !== undefined) payload.day = item.day_of_week.trim();
      if (item.memberId !== undefined) payload.member_id = item.memberId ? Number(item.memberId) : null;
      if (item.member_id !== undefined) payload.member_id = item.member_id ? Number(item.member_id) : null;
      if (item.memberName !== undefined) payload.member_name = item.memberName.trim();
      if (item.member_name !== undefined) payload.member_name = item.member_name.trim();
      if (item.tasks !== undefined) payload.tasks = item.tasks;

      try {
        let { data, error } = await client.from('piket_schedules').update(payload).eq('id', id).select();

        if (error && error.message && (error.message.toLowerCase().includes('foreign') || error.message.toLowerCase().includes('violates foreign key'))) {
          payload.member_id = null;
          const retryRes = await client.from('piket_schedules').update(payload).eq('id', id).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('piket.update Supabase error:', error);
          throw new Error(`Jadwal piket belum dapat diperbarui: ${error.message}`);
        }
        return data && data[0] ? data[0] : { id, ...payload };
      } catch (err: any) {
        console.error('piket.update exception:', err);
        throw new Error(err.message || 'Jadwal piket belum dapat diperbarui ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async delete(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client.from('piket_schedules').select('*').eq('id', id);
        const existing = data && data[0] ? data[0] : null;
        await client.from('piket_schedules').delete().eq('id', id);
        return existing;
      } catch (err: any) {
        console.warn('piket.delete exception:', err.message);
        return null;
      }
    },
  },

  // ==========================================
  // STORIES (MEMBER STORIES)
  // ==========================================
  stories: {
    async getPublicActive() {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const now = new Date().toISOString();
        let list: any[] = [];

        // Attempt joined query first
        const joinedRes = await client
          .from('member_stories')
          .select(`
            *,
            members:member_id (
              full_name,
              nickname,
              role,
              photo_number
            )
          `)
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('created_at', { ascending: true });

        if (!joinedRes.error && Array.isArray(joinedRes.data)) {
          list = joinedRes.data.map((s: any) => ({
            ...s,
            member_name: s.members?.full_name,
            member_nickname: s.members?.nickname,
            member_role: s.members?.role,
            member_photo: s.members?.photo_number,
          }));
        } else {
          // Fallback to flat query if foreign key relationship is not yet indexed in schema cache
          const flatRes = await client
            .from('member_stories')
            .select('*')
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now}`)
            .order('created_at', { ascending: true });

          if (flatRes.error) {
            console.warn('stories.getPublicActive flat query warning:', flatRes.error.message);
            return [];
          }

          const rawStories = flatRes.data || [];
          if (rawStories.length === 0) return [];

          const { data: mems } = await client
            .from('members')
            .select('id, full_name, nickname, role, photo_number');
          const memMap: Record<string, any> = {};
          (mems || []).forEach((m: any) => {
            memMap[String(m.id)] = m;
          });

          list = rawStories.map((s: any) => {
            const m = memMap[String(s.member_id)] || {};
            return {
              ...s,
              member_name: m.full_name || '',
              member_nickname: m.nickname || '',
              member_role: m.role || '',
              member_photo: m.photo_number || null,
            };
          });
        }

        return list;
      } catch (err: any) {
        console.warn('stories.getPublicActive exception:', err.message);
        return [];
      }
    },

    async getById(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client.from('member_stories').select('*').eq('id', id).maybeSingle();
        return data;
      } catch (err: any) {
        console.warn('stories.getById exception:', err.message);
        return null;
      }
    },

    async getByMemberId(memberId: number | string) {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const now = new Date().toISOString();
        const { data, error } = await client
          .from('member_stories')
          .select('*')
          .eq('member_id', memberId)
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
      } catch (err: any) {
        console.warn('stories.getByMemberId exception:', err.message);
        return [];
      }
    },

    async getAllByMemberId(memberId: number | string) {
      const client = getSupabaseClient();
      if (!client) return [];
      try {
        const { data, error } = await client
          .from('member_stories')
          .select('*')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
      } catch (err: any) {
        console.warn('stories.getAllByMemberId exception:', err.message);
        return [];
      }
    },

    async countActiveByMemberId(memberId: number | string): Promise<number> {
      const client = getSupabaseClient();
      if (!client) return 0;
      try {
        const now = new Date().toISOString();
        const { count, error } = await client
          .from('member_stories')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', memberId)
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gt.${now}`);
        if (error) throw new Error(error.message);
        return count || 0;
      } catch (err: any) {
        console.warn('stories.countActiveByMemberId exception:', err.message);
        return 0;
      }
    },

    async create(story: {
      memberId: number | string;
      mediaUrl: string;
      caption?: string | null;
      expirationType: string;
      expiresAt?: string | null;
    }) {
      const client = getSupabaseClient();
      if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');
      const now = new Date().toISOString();
      const payload: Record<string, any> = {
        member_id: Number(story.memberId),
        media_url: story.mediaUrl,
        caption: story.caption || null,
        expiration_type: story.expirationType,
        expires_at: story.expiresAt || null,
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      try {
        const { data, error } = await client.from('member_stories').insert(payload).select().single();
        if (error) {
          console.error('stories.create Supabase error:', error);
          throw new Error('Story belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
        }
        return data;
      } catch (err: any) {
        console.error('stories.create exception:', err);
        throw new Error(err.message?.includes('belum dapat') ? err.message : 'Story belum dapat disimpan ke server. Silakan coba beberapa saat lagi.');
      }
    },

    async update(id: number | string, updates: Partial<{ caption: string | null; expiration_type: string; expires_at: string | null; is_active: boolean }>) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const payload: Record<string, any> = {
          ...updates,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await client
          .from('member_stories')
          .update(payload)
          .eq('id', id)
          .select()
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      } catch (err: any) {
        console.warn('stories.update exception:', err.message);
        return null;
      }
    },

    async delete(id: number | string) {
      const client = getSupabaseClient();
      if (!client) return null;
      try {
        const { data } = await client.from('member_stories').select('*').eq('id', id).maybeSingle();
        await client.from('member_stories').delete().eq('id', id);
        return data;
      } catch (err: any) {
        console.warn('stories.delete exception:', err.message);
        return null;
      }
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
