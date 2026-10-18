import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.js';
import { formatGalleryItem } from './supabase.js';

const require = createRequire(import.meta.url);
let dbInstance: any = null;

function getSqliteDb(): any {
  if (CONFIG.IS_SUPABASE_CONFIGURED) {
    throw new Error('Local SQLite database should not be accessed when Supabase is configured.');
  }

  if (!dbInstance) {
    try {
      const { DatabaseSync } = require('node:sqlite');
      const dbDir = path.dirname(CONFIG.DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      dbInstance = new DatabaseSync(CONFIG.DB_PATH);
      try {
        dbInstance.exec('PRAGMA foreign_keys = ON;');
        dbInstance.exec('PRAGMA journal_mode = WAL;');
      } catch {
        // Ignored if PRAGMA fails
      }
    } catch (err: any) {
      console.error('Failed to load local SQLite engine:', err.message);
      throw new Error(`SQLite engine unavailable: ${err.message}. On Vercel, configure SUPABASE_URL and SUPABASE_ANON_KEY.`);
    }
  }
  return dbInstance;
}

export const rawQuery = {
  run(sql: string, ...params: any[]) {
    const stmt = getSqliteDb().prepare(sql);
    return stmt.run(...params);
  },
  get<T = any>(sql: string, ...params: any[]): T | undefined {
    const stmt = getSqliteDb().prepare(sql);
    return stmt.get(...params) as T | undefined;
  },
  all<T = any>(sql: string, ...params: any[]): T[] {
    const stmt = getSqliteDb().prepare(sql);
    return stmt.all(...params) as T[];
  },
  exec(sql: string) {
    return getSqliteDb().exec(sql);
  },
};

export const sqliteDb = {
  // ==========================================
  // GALLERY
  // ==========================================
  gallery: {
    async getAll(category?: string) {
      let sql = 'SELECT * FROM gallery ORDER BY event_date DESC, id DESC';
      const params: any[] = [];
      if (category && category !== 'Semua') {
        sql = 'SELECT * FROM gallery WHERE category = ? ORDER BY event_date DESC, id DESC';
        params.push(category);
      }
      return rawQuery.all(sql, ...params).map(formatGalleryItem);
    },

    async getById(id: number | string) {
      const res = rawQuery.get('SELECT * FROM gallery WHERE id = ?', id);
      return res ? formatGalleryItem(res) : null;
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

      const res = rawQuery.run(
        `INSERT INTO gallery (title, event_identity, category, description, image_path, event_date, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.title.trim(),
        item.eventIdentity.trim(),
        item.category || 'Kegiatan',
        item.description.trim(),
        finalImagePath,
        item.eventDate,
        item.createdBy,
        now,
        now
      );
      return formatGalleryItem({ id: res.lastInsertRowid, ...item, image_path: finalImagePath });
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
      const existing = await this.getById(id);
      if (!existing) throw new Error('Foto tidak ditemukan.');

      let finalImagePath = item.imagePath !== undefined ? item.imagePath.trim() : existing.image_path;
      if (item.photos && Array.isArray(item.photos)) {
        const cleanPhotos = item.photos.filter((p) => typeof p === 'string' && p.trim().length > 0);
        if (cleanPhotos.length === 1) {
          finalImagePath = cleanPhotos[0];
        } else if (cleanPhotos.length > 1) {
          finalImagePath = JSON.stringify(cleanPhotos);
        }
      }

      const now = new Date().toISOString();
      rawQuery.run(
        `UPDATE gallery
         SET title = ?, event_identity = ?, category = ?, description = ?, image_path = ?, event_date = ?, created_by = ?, updated_at = ?
         WHERE id = ?`,
        item.title !== undefined ? item.title.trim() : existing.title,
        item.eventIdentity !== undefined ? item.eventIdentity.trim() : existing.event_identity,
        item.category !== undefined ? item.category : existing.category,
        item.description !== undefined ? item.description.trim() : existing.description,
        finalImagePath,
        item.eventDate !== undefined ? item.eventDate : existing.event_date,
        item.createdBy !== undefined ? item.createdBy.trim() : existing.created_by,
        now,
        id
      );
      return this.getById(id);
    },

    async delete(id: number | string) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Foto tidak ditemukan.');
      rawQuery.run('DELETE FROM gallery WHERE id = ?', id);
      return existing;
    },
  },

  // ==========================================
  // MEMBERS
  // ==========================================
  members: {
    async getAll() {
      const guru = rawQuery.all(
        `SELECT id, full_name, nickname, birth_place, birth_date, email, role, member_type, photo_number, phone
         FROM members WHERE member_type = 'guru'
         ORDER BY id ASC`
      );

      const siswa = rawQuery.all(
        `SELECT id, attendance_number, full_name, nickname, birth_place, birth_date, email, role, member_type, photo_number, phone
         FROM members WHERE member_type = 'siswa'
         ORDER BY attendance_number ASC, full_name ASC`
      );

      return {
        guru,
        siswa,
        totalGuru: guru.length,
        totalSiswa: siswa.length,
        totalMembers: guru.length + siswa.length,
      };
    },

    async getById(id: number | string) {
      return rawQuery.get('SELECT * FROM members WHERE id = ?', id);
    },

    async getGuruCount(): Promise<number> {
      const row = rawQuery.get<any>("SELECT COUNT(*) as count FROM members WHERE member_type = 'guru'");
      return row?.count || 0;
    },

    async checkDuplicateAttendance(attNum: number, excludeId?: number | string) {
      if (excludeId !== undefined) {
        const row = rawQuery.get(
          "SELECT id FROM members WHERE attendance_number = ? AND id != ? AND member_type = 'siswa'",
          attNum,
          excludeId
        );
        return Boolean(row);
      }
      const row = rawQuery.get("SELECT id FROM members WHERE attendance_number = ? AND member_type = 'siswa'", attNum);
      return Boolean(row);
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
      const now = new Date().toISOString();
      const res = rawQuery.run(
        `INSERT INTO members (attendance_number, full_name, nickname, birth_place, birth_date, email, role, member_type, photo_number, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.attendanceNumber,
        item.fullName.trim(),
        item.nickname ? item.nickname.trim() : null,
        item.birthPlace ? item.birthPlace.trim() : null,
        item.birthDate || null,
        item.email ? item.email.trim() : null,
        item.role.trim(),
        item.memberType,
        item.photoNumber || null,
        item.phone ? item.phone.trim() : null,
        now,
        now
      );
      return { id: res.lastInsertRowid, ...item };
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
      const existing = await this.getById(id);
      if (!existing) throw new Error('Anggota tidak ditemukan.');

      const now = new Date().toISOString();
      rawQuery.run(
        `UPDATE members
         SET full_name = ?, nickname = ?, birth_place = ?, birth_date = ?, email = ?,
             role = ?, member_type = ?, attendance_number = ?, photo_number = ?, phone = ?, updated_at = ?
         WHERE id = ?`,
        item.fullName !== undefined ? item.fullName.trim() : existing.full_name,
        item.nickname !== undefined ? (item.nickname ? item.nickname.trim() : null) : existing.nickname,
        item.birthPlace !== undefined ? (item.birthPlace ? item.birthPlace.trim() : null) : existing.birth_place,
        item.birthDate !== undefined ? item.birthDate : existing.birth_date,
        item.email !== undefined ? (item.email ? item.email.trim() : null) : existing.email,
        item.role !== undefined ? item.role.trim() : existing.role,
        item.memberType !== undefined ? item.memberType : existing.member_type,
        item.attendanceNumber !== undefined ? item.attendanceNumber : existing.attendance_number,
        item.photoNumber !== undefined ? item.photoNumber : existing.photo_number,
        item.phone !== undefined ? (item.phone ? item.phone.trim() : null) : existing.phone,
        now,
        id
      );
      return this.getById(id);
    },

    async delete(id: number | string) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Anggota tidak ditemukan.');
      rawQuery.run('DELETE FROM members WHERE id = ?', id);
      return existing;
    },
  },

  // ==========================================
  // SOCIAL MEDIA
  // ==========================================
  social: {
    async getActive() {
      return rawQuery.all('SELECT * FROM social_media WHERE is_active = 1 ORDER BY id ASC');
    },

    async getAll() {
      return rawQuery.all('SELECT * FROM social_media ORDER BY id ASC');
    },

    async getById(id: number | string) {
      return rawQuery.get('SELECT * FROM social_media WHERE id = ?', id);
    },

    async create(item: { platform: string; username: string; url: string; icon?: string }) {
      const now = new Date().toISOString();
      const res = rawQuery.run(
        `INSERT INTO social_media (platform, username, url, icon, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        item.platform.trim(),
        item.username.trim(),
        item.url.trim(),
        item.icon || 'Globe',
        now,
        now
      );
      return { id: res.lastInsertRowid, ...item, is_active: 1 };
    },

    async update(id: number | string, item: { platform?: string; username?: string; url?: string; icon?: string; isActive?: boolean | number }) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Media sosial tidak ditemukan.');

      const now = new Date().toISOString();
      rawQuery.run(
        `UPDATE social_media
         SET platform = ?, username = ?, url = ?, icon = ?, is_active = ?, updated_at = ?
         WHERE id = ?`,
        item.platform !== undefined ? item.platform.trim() : existing.platform,
        item.username !== undefined ? item.username.trim() : existing.username,
        item.url !== undefined ? item.url.trim() : existing.url,
        item.icon !== undefined ? item.icon : existing.icon,
        item.isActive !== undefined ? (item.isActive ? 1 : 0) : existing.is_active,
        now,
        id
      );
      return this.getById(id);
    },

    async delete(id: number | string) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Media sosial tidak ditemukan.');
      rawQuery.run('DELETE FROM social_media WHERE id = ?', id);
      return existing;
    },
  },

  // ==========================================
  // ADMIN & SETTINGS
  // ==========================================
  admin: {
    async getMetrics() {
      const guruCount = rawQuery.get<any>("SELECT COUNT(*) as count FROM members WHERE member_type = 'guru'")?.count || 0;
      const siswaCount = rawQuery.get<any>("SELECT COUNT(*) as count FROM members WHERE member_type = 'siswa'")?.count || 0;
      const totalMembers = guruCount + siswaCount;
      const galleryCount = rawQuery.get<any>('SELECT COUNT(*) as count FROM gallery')?.count || 0;
      const socialCount = rawQuery.get<any>('SELECT COUNT(*) as count FROM social_media WHERE is_active = 1')?.count || 0;
      const totalSocial = rawQuery.get<any>('SELECT COUNT(*) as count FROM social_media')?.count || 0;

      return {
        totalMembers,
        guruCount,
        siswaCount,
        galleryCount,
        socialCount,
        totalSocial,
      };
    },

    async getSettings() {
      const settingsRows = rawQuery.all('SELECT * FROM website_settings');
      const settingsMap: Record<string, string> = {};
      for (const row of settingsRows) {
        settingsMap[row.key] = row.value;
      }

      const authState = rawQuery.get<any>('SELECT failed_attempts, locked_until, last_password_change, updated_at FROM admin_auth_state WHERE id = 1');

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
      const now = new Date().toISOString();
      rawQuery.run(
        'INSERT OR REPLACE INTO website_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)',
        key,
        value.trim(),
        description || '',
        now
      );
    },

    async getAuditLogs(limit = 50) {
      return rawQuery.all('SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?', limit);
    },

    async recordAuditLog(userName: string, action: string, entityType: string, details: string) {
      try {
        const now = new Date().toISOString();
        rawQuery.run(
          `INSERT INTO activity_logs (user_name, action, entity_type, details, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          userName,
          action,
          entityType,
          details,
          now
        );
      } catch (err) {
        console.error('Failed to write audit log to SQLite:', err);
      }
    },
  },

  // ==========================================
  // AUTH
  // ==========================================
  auth: {
    async getAuthState() {
      let state = rawQuery.get<any>('SELECT * FROM admin_auth_state WHERE id = 1');
      if (!state) {
        const initialHash = await bcrypt.hash('icptkj35', 10);
        const now = new Date().toISOString();
        rawQuery.run(
          `INSERT INTO admin_auth_state (id, password_hash, failed_attempts, locked_until, last_failed_at, last_password_change, updated_at)
           VALUES (1, ?, 0, NULL, NULL, ?, ?)`,
          initialHash,
          now,
          now
        );
        state = rawQuery.get<any>('SELECT * FROM admin_auth_state WHERE id = 1')!;
      }
      return state;
    },

    async updateAuthState(fields: {
      passwordHash?: string;
      failedAttempts?: number;
      lockedUntil?: string | null;
      lastFailedAt?: string | null;
      lastPasswordChange?: string;
    }) {
      const now = new Date().toISOString();
      const current = await this.getAuthState();

      const newHash = fields.passwordHash !== undefined ? fields.passwordHash : current.password_hash;
      const newFailed = fields.failedAttempts !== undefined ? fields.failedAttempts : current.failed_attempts;
      const newLocked = fields.lockedUntil !== undefined ? fields.lockedUntil : current.locked_until;
      const newLastFailed = fields.lastFailedAt !== undefined ? fields.lastFailedAt : current.last_failed_at;
      const newChange = fields.lastPasswordChange !== undefined ? fields.lastPasswordChange : current.last_password_change;

      rawQuery.run(
        `UPDATE admin_auth_state
         SET password_hash = ?, failed_attempts = ?, locked_until = ?, last_failed_at = ?, last_password_change = ?, updated_at = ?
         WHERE id = 1`,
        newHash,
        newFailed,
        newLocked,
        newLastFailed,
        newChange,
        now
      );

      return this.getAuthState();
    },

    async resetLockout() {
      const now = new Date().toISOString();
      rawQuery.run(
        'UPDATE admin_auth_state SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = 1',
        now
      );
    },
  },

  // ==========================================
  // PORTAL AUTH & ACCOUNTS
  // ==========================================
  portalAuth: {
    async findMemberByEmail(email: string) {
      const cleanEmail = email.trim().toLowerCase();
      return rawQuery.get<any>(
        'SELECT * FROM members WHERE LOWER(email) = ?',
        cleanEmail
      );
    },

    async getAccountByMemberId(memberId: number | string) {
      return rawQuery.get<any>(
        'SELECT * FROM member_accounts WHERE member_id = ?',
        memberId
      );
    },

    async getAccountByEmail(email: string) {
      const cleanEmail = email.trim().toLowerCase();
      return rawQuery.get<any>(
        'SELECT * FROM member_accounts WHERE LOWER(email) = ?',
        cleanEmail
      );
    },

    async createAccount(memberId: number | string, email: string, passwordHash: string) {
      const now = new Date().toISOString();
      const cleanEmail = email.trim().toLowerCase();
      rawQuery.run(
        `INSERT INTO member_accounts (member_id, email, password_hash, has_changed_password, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)`,
        memberId,
        cleanEmail,
        passwordHash,
        now,
        now
      );
      return this.getAccountByMemberId(memberId);
    },

    async updatePassword(memberId: number | string, passwordHash: string) {
      const now = new Date().toISOString();
      rawQuery.run(
        `UPDATE member_accounts
         SET password_hash = ?, has_changed_password = 1, updated_at = ?
         WHERE member_id = ?`,
        passwordHash,
        now,
        memberId
      );
      return this.getAccountByMemberId(memberId);
    },

    async updateEmail(memberId: number | string, newEmail: string) {
      const now = new Date().toISOString();
      const cleanEmail = newEmail.trim().toLowerCase();
      rawQuery.run(
        'UPDATE members SET email = ?, updated_at = ? WHERE id = ?',
        cleanEmail,
        now,
        memberId
      );
      rawQuery.run(
        'UPDATE member_accounts SET email = ?, updated_at = ? WHERE member_id = ?',
        cleanEmail,
        now,
        memberId
      );
      return this.findMemberByEmail(cleanEmail);
    },

    async saveVerificationCode(email: string, code: string, purpose: string, newEmail?: string) {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      rawQuery.run(
        `INSERT INTO verification_codes (email, code, purpose, new_email, expires_at, used, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        email.trim().toLowerCase(),
        code,
        purpose,
        newEmail ? newEmail.trim().toLowerCase() : null,
        expiresAt,
        now
      );
    },

    async verifyCode(email: string, code: string, purpose: string) {
      const now = new Date().toISOString();
      const record = rawQuery.get<any>(
        `SELECT * FROM verification_codes
         WHERE LOWER(email) = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > ?
         ORDER BY id DESC LIMIT 1`,
        email.trim().toLowerCase(),
        code.trim(),
        purpose,
        now
      );
      if (!record) return null;
      rawQuery.run('UPDATE verification_codes SET used = 1 WHERE id = ?', record.id);
      return record;
    },
  },

  // ==========================================
  // KAS MINGGUAN
  // ==========================================
  kas: {
    async getAll(monthYear?: string) {
      let sql = `
        SELECT k.*, m.full_name, m.attendance_number, m.role
        FROM class_kas_records k
        JOIN members m ON k.member_id = m.id
      `;
      const params: any[] = [];
      if (monthYear) {
        sql += ' WHERE k.month_year = ?';
        params.push(monthYear);
      }
      sql += ' ORDER BY k.month_year DESC, k.week_number ASC, m.attendance_number ASC';
      return rawQuery.all<any>(sql, ...params);
    },

    async getByMember(memberId: number | string) {
      return rawQuery.all<any>(
        `SELECT * FROM class_kas_records
         WHERE member_id = ?
         ORDER BY month_year DESC, week_number ASC`,
        memberId
      );
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
      const now = new Date().toISOString();
      const amount = item.amount || 3000;
      const status = item.status || 'paid';
      const paidAt = status === 'paid' ? now : null;

      const existing = rawQuery.get<any>(
        'SELECT id FROM class_kas_records WHERE member_id = ? AND week_number = ? AND month_year = ?',
        item.memberId,
        item.weekNumber,
        item.monthYear
      );

      if (existing) {
        rawQuery.run(
          `UPDATE class_kas_records
           SET amount = ?, status = ?, paid_at = ?, recorded_by = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
          amount,
          status,
          paidAt,
          item.recordedBy,
          item.notes || null,
          now,
          existing.id
        );
        return rawQuery.get<any>('SELECT * FROM class_kas_records WHERE id = ?', existing.id);
      } else {
        rawQuery.run(
          `INSERT INTO class_kas_records (member_id, week_number, month_year, amount, status, paid_at, recorded_by, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          item.memberId,
          item.weekNumber,
          item.monthYear,
          amount,
          status,
          paidAt,
          item.recordedBy,
          item.notes || null,
          now,
          now
        );
        return rawQuery.get<any>(
          'SELECT * FROM class_kas_records WHERE member_id = ? AND week_number = ? AND month_year = ?',
          item.memberId,
          item.weekNumber,
          item.monthYear
        );
      }
    },

    async deletePayment(id: number | string) {
      const existing = rawQuery.get<any>('SELECT * FROM class_kas_records WHERE id = ?', id);
      rawQuery.run('DELETE FROM class_kas_records WHERE id = ?', id);
      return existing;
    },

    async getSummary() {
      const totalPaid = rawQuery.get<any>(
        "SELECT SUM(amount) as total FROM class_kas_records WHERE status = 'paid'"
      );
      const settingNominal = rawQuery.get<any>(
        "SELECT value FROM website_settings WHERE key = 'kas_nominal'"
      );
      return {
        totalCollected: totalPaid?.total || 0,
        weeklyNominal: settingNominal ? parseInt(settingNominal.value, 10) : 3000,
      };
    },
  },

  // ==========================================
  // TUGAS
  // ==========================================
  tasks: {
    async getAll() {
      return rawQuery.all<any>('SELECT * FROM class_tasks ORDER BY deadline ASC');
    },

    async getById(id: number | string) {
      return rawQuery.get<any>('SELECT * FROM class_tasks WHERE id = ?', id);
    },

    async create(item: {
      title: string;
      subject: string;
      teacherName?: string;
      deadline: string;
      description?: string;
      notes?: string;
      createdBy: string;
    }) {
      const now = new Date().toISOString();
      rawQuery.run(
        `INSERT INTO class_tasks (title, subject, teacher_name, deadline, description, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.title.trim(),
        item.subject.trim(),
        item.teacherName?.trim() || null,
        item.deadline.trim(),
        item.description?.trim() || null,
        item.notes?.trim() || null,
        item.createdBy,
        now,
        now
      );
      return rawQuery.get<any>('SELECT * FROM class_tasks ORDER BY id DESC LIMIT 1');
    },

    async update(id: number | string, item: Partial<any>) {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Tugas tidak ditemukan.');
      const now = new Date().toISOString();

      const title = item.title !== undefined ? item.title.trim() : existing.title;
      const subject = item.subject !== undefined ? item.subject.trim() : existing.subject;
      const teacherName = item.teacherName !== undefined ? item.teacherName?.trim() : existing.teacher_name;
      const deadline = item.deadline !== undefined ? item.deadline.trim() : existing.deadline;
      const description = item.description !== undefined ? item.description?.trim() : existing.description;
      const notes = item.notes !== undefined ? item.notes?.trim() : existing.notes;

      rawQuery.run(
        `UPDATE class_tasks
         SET title = ?, subject = ?, teacher_name = ?, deadline = ?, description = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        title,
        subject,
        teacherName,
        deadline,
        description,
        notes,
        now,
        id
      );
      return this.getById(id);
    },

    async delete(id: number | string) {
      const existing = await this.getById(id);
      rawQuery.run('DELETE FROM class_tasks WHERE id = ?', id);
      return existing;
    },
  },

  // ==========================================
  // JADWAL PELAJARAN
  // ==========================================
  schedules: {
    async getAll() {
      return rawQuery.all<any>(
        "SELECT * FROM class_schedules ORDER BY CASE day WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 ELSE 7 END, start_time ASC, order_index ASC"
      );
    },

    async create(item: {
      day: string;
      startTime: string;
      endTime: string;
      subject: string;
      teacherName: string;
      room?: string;
      orderIndex?: number;
    }) {
      const now = new Date().toISOString();
      rawQuery.run(
        `INSERT INTO class_schedules (day, start_time, end_time, subject, teacher_name, room, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.day.trim(),
        item.startTime.trim(),
        item.endTime.trim(),
        item.subject.trim(),
        item.teacherName.trim(),
        item.room?.trim() || null,
        item.orderIndex || 0,
        now,
        now
      );
      return rawQuery.get<any>('SELECT * FROM class_schedules ORDER BY id DESC LIMIT 1');
    },

    async update(id: number | string, item: Partial<any>) {
      const existing = rawQuery.get<any>('SELECT * FROM class_schedules WHERE id = ?', id);
      if (!existing) throw new Error('Jadwal tidak ditemukan.');
      const now = new Date().toISOString();

      rawQuery.run(
        `UPDATE class_schedules
         SET day = ?, start_time = ?, end_time = ?, subject = ?, teacher_name = ?, room = ?, order_index = ?, updated_at = ?
         WHERE id = ?`,
        item.day || existing.day,
        item.startTime || existing.start_time,
        item.endTime || existing.end_time,
        item.subject || existing.subject,
        item.teacherName || existing.teacher_name,
        item.room !== undefined ? item.room : existing.room,
        item.orderIndex !== undefined ? item.orderIndex : existing.order_index,
        now,
        id
      );
      return rawQuery.get<any>('SELECT * FROM class_schedules WHERE id = ?', id);
    },

    async delete(id: number | string) {
      const existing = rawQuery.get<any>('SELECT * FROM class_schedules WHERE id = ?', id);
      rawQuery.run('DELETE FROM class_schedules WHERE id = ?', id);
      return existing;
    },
  },

  // ==========================================
  // JADWAL PIKET
  // ==========================================
  piket: {
    async getAll() {
      return rawQuery.all<any>(
        "SELECT * FROM piket_schedules ORDER BY CASE day WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 ELSE 6 END, id ASC"
      );
    },

    async create(item: {
      day: string;
      memberId?: number | null;
      memberName: string;
      tasks?: string;
    }) {
      const now = new Date().toISOString();
      rawQuery.run(
        `INSERT INTO piket_schedules (day, member_id, member_name, tasks, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        item.day.trim(),
        item.memberId || null,
        item.memberName.trim(),
        item.tasks?.trim() || 'Membersihkan kelas dan merapikan perlengkapan',
        now,
        now
      );
      return rawQuery.get<any>('SELECT * FROM piket_schedules ORDER BY id DESC LIMIT 1');
    },

    async update(id: number | string, item: Partial<any>) {
      const existing = rawQuery.get<any>('SELECT * FROM piket_schedules WHERE id = ?', id);
      if (!existing) throw new Error('Jadwal piket tidak ditemukan.');
      const now = new Date().toISOString();

      rawQuery.run(
        `UPDATE piket_schedules
         SET day = ?, member_id = ?, member_name = ?, tasks = ?, updated_at = ?
         WHERE id = ?`,
        item.day || existing.day,
        item.memberId !== undefined ? item.memberId : existing.member_id,
        item.memberName || existing.member_name,
        item.tasks !== undefined ? item.tasks : existing.tasks,
        now,
        id
      );
      return rawQuery.get<any>('SELECT * FROM piket_schedules WHERE id = ?', id);
    },

    async delete(id: number | string) {
      const existing = rawQuery.get<any>('SELECT * FROM piket_schedules WHERE id = ?', id);
      rawQuery.run('DELETE FROM piket_schedules WHERE id = ?', id);
      return existing;
    },
  },
};
