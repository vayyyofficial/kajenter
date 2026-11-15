/**
 * CLASS ROLLING - Student Service
 *
 * SINGLE SOURCE OF TRUTH
 * ----------------------
 * Student identity (name, nickname, absen number) lives in the portal
 * `members` data (member_type = 'siswa'), managed in Admin → Anggota.
 * This service DERIVES the Rolling roster from those members, so a name
 * changed in either admin area is shown everywhere.
 *
 * The Supabase `students` table is kept only as the technical link that the
 * existing seating RPC / assignments (`student_id` UUID) depend on. Rows are
 * matched to members by absen number, then by normalised full name.
 * Identity edits made from Rolling are written to the member first and then
 * mirrored to the linked `students` row (write-through) — never the reverse.
 *
 * Student data is publicly viewable. Mutations require the main admin session.
 * See docs/FRONTEND-ADMIN-ROLLING.md for the backend work that would make this
 * a true single record (e.g. students.member_id FK or a view over members).
 */

import { INITIAL_STUDENTS, SeatingStudent } from '../data/seatingStudents';
import { seatingStorageService } from './seatingStorageService';
import { isAdminSessionActive } from './adminSession';
import { seatingSupabase, isSupabaseConfigured } from './seatingSupabase';
import { api } from './api';
import type { Member } from '../types';

const STORAGE_KEY = 'students';
const NO_SESSION = 'Sesi administrator tidak aktif. Silakan login kembali.';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StudentRow {
  id: string;
  number: number;
  full_name: string;
  nickname: string;
  is_active: boolean;
}

const normalizeName = (name: string): string =>
  (name || '').trim().replace(/\s+/g, ' ').toLowerCase();

const isRowId = (id: string): boolean => UUID_RE.test(id);

/**
 * Pure merge: members (identity) + students rows (Rolling link / active flag).
 */
export function mergeRoster(members: Member[] | null, rows: StudentRow[] | null): SeatingStudent[] {
  const rowList = rows || [];

  if (!members) {
    return rowList.map((r) => ({
      id: r.id,
      number: r.number,
      fullName: r.full_name,
      nickname: r.nickname,
      isActive: r.is_active,
      rollingLinked: true,
    }));
  }

  const used = new Set<string>();
  const byNumber = new Map<number, StudentRow>();
  const byName = new Map<string, StudentRow>();
  rowList.forEach((r) => {
    byNumber.set(r.number, r);
    byName.set(normalizeName(r.full_name), r);
  });

  const result: SeatingStudent[] = [];

  [...members]
    .sort((a, b) => (a.attendance_number ?? 9999) - (b.attendance_number ?? 9999))
    .forEach((m) => {
      let row: StudentRow | undefined =
        m.attendance_number != null ? byNumber.get(m.attendance_number) : undefined;
      if (row && used.has(row.id)) row = undefined;
      if (!row) {
        const byFullName = byName.get(normalizeName(m.full_name));
        if (byFullName && !used.has(byFullName.id)) row = byFullName;
      }
      if (row) used.add(row.id);

      result.push({
        id: row ? row.id : `member-${m.id}`,
        number: m.attendance_number ?? row?.number ?? 0,
        fullName: m.full_name,
        nickname: (m.nickname || '').trim() || row?.nickname || m.full_name.split(' ')[0],
        isActive: row ? row.is_active : true,
        memberId: m.id,
        rollingLinked: Boolean(row),
      });
    });

  // Active Rolling rows without a member still take part in the DB shuffle,
  // so they must stay visible. Inactive orphans (e.g. removed students) are hidden.
  rowList.forEach((r) => {
    if (used.has(r.id) || !r.is_active) return;
    result.push({
      id: r.id,
      number: r.number,
      fullName: r.full_name,
      nickname: r.nickname,
      isActive: true,
      rollingLinked: true,
    });
  });

  return result.sort((a, b) => a.number - b.number);
}

async function fetchSiswaMembers(): Promise<Member[] | null> {
  try {
    const res = await api.members.getAll();
    if (res?.success && Array.isArray(res.data?.siswa)) return res.data.siswa;
  } catch (err) {
    console.warn('[seatingStudentService] members fetch failed:', err);
  }
  return null;
}

async function fetchStudentRows(): Promise<StudentRow[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await seatingSupabase
      .from('students')
      .select('*')
      .order('number', { ascending: true });
    if (!error && Array.isArray(data)) return data as StudentRow[];
  } catch (err) {
    console.warn('[seatingStudentService] students fetch failed:', err);
  }
  return null;
}

async function mirrorToRow(id: string, payload: Record<string, any>): Promise<boolean> {
  if (!isSupabaseConfigured || !isRowId(id)) return false;
  try {
    const { error } = await seatingSupabase
      .from('students')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch (err) {
    console.warn('[seatingStudentService] mirror update failed:', err);
    return false;
  }
}

export const seatingStudentService = {
  /**
   * Synchronous / cached roster (read-only, public).
   * The last-resort INITIAL_STUDENTS fallback is only used when neither the
   * members API nor Supabase has ever been reachable.
   */
  getStudents(): SeatingStudent[] {
    const saved = seatingStorageService.get<SeatingStudent[]>(STORAGE_KEY, null);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      return [...INITIAL_STUDENTS];
    }
    return saved;
  },

  /**
   * Fresh roster: members (identity) merged with Supabase students rows (link).
   */
  async fetchStudents(): Promise<SeatingStudent[]> {
    const [members, rows] = await Promise.all([fetchSiswaMembers(), fetchStudentRows()]);
    if (members || rows) {
      const merged = mergeRoster(members, rows);
      if (merged.length > 0) {
        seatingStorageService.set(STORAGE_KEY, merged);
        return merged;
      }
    }
    return this.getStudents();
  },

  getActiveStudents(): SeatingStudent[] {
    return this.getStudents().filter((s) => s.isActive);
  },

  getStudentById(id: string): SeatingStudent | null {
    return this.getStudents().find((s) => s.id === id) || null;
  },

  saveStudents(students: SeatingStudent[]): boolean {
    return seatingStorageService.set(STORAGE_KEY, students);
  },

  /**
   * Add student — creates the MEMBER (single entry point), then the linked
   * Rolling row so the student can be seated. Requires admin session.
   */
  async addStudent({ fullName, nickname, isActive = true }: { fullName: string; nickname: string; isActive?: boolean }): Promise<any> {
    if (!isAdminSessionActive()) return { error: NO_SESSION };

    const cleanFullName = (fullName || '').trim();
    const cleanNickname = (nickname || '').trim();
    if (!cleanFullName) return { error: 'Nama lengkap wajib diisi.' };
    if (!cleanNickname) return { error: 'Nama panggilan wajib diisi.' };

    const students = this.getStudents();
    const nextNumber = students.length > 0 ? Math.max(...students.map((s) => s.number || 0)) + 1 : 1;

    let memberId: number | undefined;
    try {
      const res = await api.members.create({
        fullName: cleanFullName,
        nickname: cleanNickname,
        role: 'Siswa',
        memberType: 'siswa',
        attendanceNumber: String(nextNumber),
      });
      memberId = res?.data?.id;
    } catch (err: any) {
      return { error: err?.message || 'Gagal menambahkan siswa ke data anggota.' };
    }

    let rowId: string | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await seatingSupabase
          .from('students')
          .insert({
            number: nextNumber,
            full_name: cleanFullName,
            nickname: cleanNickname,
            is_active: Boolean(isActive),
          })
          .select()
          .single();
        if (!error && data) rowId = data.id;
      } catch (err) {
        console.warn('[seatingStudentService] Rolling row insert failed:', err);
      }
    }

    const student: SeatingStudent = {
      id: rowId || `member-${memberId}`,
      number: nextNumber,
      fullName: cleanFullName,
      nickname: cleanNickname,
      isActive: Boolean(isActive),
      memberId,
      rollingLinked: Boolean(rowId),
    };
    this.saveStudents([...students, student]);

    return rowId
      ? student
      : { ...student, warning: 'Siswa tersimpan di data anggota, tetapi belum terhubung ke tabel Rolling.' };
  },

  /**
   * Update student identity — written to the MEMBER first, then mirrored
   * to the linked Rolling row. Requires admin session.
   */
  async updateStudent(id: string, updates: Partial<SeatingStudent>): Promise<any> {
    if (!isAdminSessionActive()) return { error: NO_SESSION };

    const students = this.getStudents();
    const index = students.findIndex((s) => s.id === id);
    if (index === -1) return { error: 'Siswa tidak ditemukan.' };
    const current = students[index];

    const fullName = updates.fullName !== undefined ? updates.fullName.trim() : undefined;
    const nickname = updates.nickname !== undefined ? updates.nickname.trim() : undefined;

    if ((fullName !== undefined || nickname !== undefined) && current.memberId != null) {
      try {
        await api.members.update(current.memberId, {
          ...(fullName !== undefined ? { fullName } : {}),
          ...(nickname !== undefined ? { nickname } : {}),
        });
      } catch (err: any) {
        return { error: err?.message || 'Gagal memperbarui data anggota.' };
      }
    }

    const mirror: Record<string, any> = {};
    if (fullName !== undefined) mirror.full_name = fullName;
    if (nickname !== undefined) mirror.nickname = nickname;
    if (updates.isActive !== undefined) mirror.is_active = Boolean(updates.isActive);
    if (Object.keys(mirror).length > 0) await mirrorToRow(id, mirror);

    students[index] = {
      ...current,
      ...updates,
      fullName: fullName !== undefined ? fullName : current.fullName,
      nickname: nickname !== undefined ? nickname : current.nickname,
    };
    this.saveStudents(students);
    return students[index];
  },

  /**
   * Toggle Rolling participation (`students.is_active`). This flag is
   * Rolling-specific, so it is not part of the member record.
   */
  async toggleActive(id: string): Promise<any> {
    if (!isAdminSessionActive()) return { error: NO_SESSION };

    const students = this.getStudents();
    const student = students.find((s) => s.id === id);
    if (!student) return { error: 'Siswa tidak ditemukan.' };
    if (!isRowId(id)) {
      return { error: 'Siswa ini belum terhubung ke tabel Rolling. Hubungi developer backend.' };
    }

    const newStatus = !student.isActive;
    await mirrorToRow(id, { is_active: newStatus });

    student.isActive = newStatus;
    this.saveStudents(students);
    return student;
  },

  /**
   * Delete student — removes the MEMBER and DEACTIVATES the Rolling row
   * (rows are never hard-deleted from here: seat assignments reference them).
   */
  async deleteStudent(id: string): Promise<any> {
    if (!isAdminSessionActive()) return { error: NO_SESSION };

    const students = this.getStudents();
    const student = students.find((s) => s.id === id);
    if (!student) return { error: 'Siswa tidak ditemukan.' };

    if (student.memberId != null) {
      try {
        await api.members.delete(student.memberId);
      } catch (err: any) {
        return { error: err?.message || 'Gagal menghapus data anggota.' };
      }
    }
    await mirrorToRow(id, { is_active: false });

    this.saveStudents(students.filter((s) => s.id !== id));
    return true;
  },
};
