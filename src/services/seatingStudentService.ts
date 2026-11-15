/**
 * CLASS ROLLING - Student Service
 *
 * SINGLE SOURCE OF TRUTH
 * ----------------------
 * Student identity (name, nickname, attendance number) lives in the
 * canonical `members` data (member_type = 'siswa'), managed in Admin → Anggota.
 * This service DERIVES the Rolling roster from those members, so a name
 * changed in either admin area is shown everywhere.
 *
 * The public `students` view is a read-only compatibility layer over `members`
 * and a small UUID/participation bridge. The bridge UUID remains stable because
 * seating assignments reference it; student identity is never copied there.
 * All Rolling changes go through the authenticated main API.
 */

import { INITIAL_STUDENTS, SeatingStudent } from '../data/seatingStudents';
import { seatingStorageService } from './seatingStorageService';
import { isAdminSessionActive } from './adminSession';
import { api } from './api';
import type { Member } from '../types';

const STORAGE_KEY = 'students';
const NO_SESSION = 'Sesi administrator tidak aktif. Silakan login kembali.';

interface StudentRow {
  id: string;
  number: number;
  full_name: string;
  nickname: string;
  is_active: boolean;
  member_id?: number | string | null;
}

const normalizeName = (name: string): string =>
  (name || '').trim().replace(/\s+/g, ' ').toLowerCase();

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
  const byMemberId = new Map<string, StudentRow>();
  const byNumber = new Map<number, StudentRow>();
  const byName = new Map<string, StudentRow>();
  rowList.forEach((r) => {
    if (r.member_id != null) byMemberId.set(String(r.member_id), r);
    byNumber.set(r.number, r);
    byName.set(normalizeName(r.full_name), r);
  });

  const result: SeatingStudent[] = [];

  [...members]
    .sort((a, b) => (a.attendance_number ?? 9999) - (b.attendance_number ?? 9999))
    .forEach((m) => {
      let row: StudentRow | undefined = byMemberId.get(String(m.id));
      if (!row && m.attendance_number != null) row = byNumber.get(m.attendance_number);
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
  try {
    const response = await api.rollingStudents.getAll();
    if (response?.success && Array.isArray(response.data)) {
      return response.data.map((row) => ({ ...row, is_active: Boolean(row.is_active) }));
    }
  } catch (err) {
    console.warn('[seatingStudentService] Rolling roster fetch failed:', err);
  }
  return null;
}

function fromStudentRow(row: StudentRow): SeatingStudent {
  return {
    id: row.id,
    number: row.number,
    fullName: row.full_name,
    nickname: row.nickname,
    isActive: Boolean(row.is_active),
    memberId: row.member_id != null ? Number(row.member_id) : undefined,
    rollingLinked: true,
  };
}

export const seatingStudentService = {
  /**
   * Synchronous / cached roster (read-only, public).
   * The last-resort INITIAL_STUDENTS fallback is only used when neither the
   * members API nor Supabase has ever been reachable.
   */
  getStudents(): SeatingStudent[] {
    const saved = seatingStorageService.get<SeatingStudent[]>(STORAGE_KEY, null);
    if (!Array.isArray(saved)) return [...INITIAL_STUDENTS];
    return saved;
  },

  /**
   * Fresh roster: members (identity) merged with Supabase students rows (link).
   */
  async fetchStudents(): Promise<SeatingStudent[]> {
    const [members, rows] = await Promise.all([fetchSiswaMembers(), fetchStudentRows()]);
    if (members || rows) {
      const merged = mergeRoster(members, rows);
      seatingStorageService.set(STORAGE_KEY, merged);
      return merged;
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
   * Add the canonical member. The database creates its Rolling UUID link
   * automatically; no duplicate student identity row is inserted here.
   */
  async addStudent({ fullName, nickname, isActive = true }: { fullName: string; nickname: string; isActive?: boolean }): Promise<any> {
    if (!isAdminSessionActive()) return { error: NO_SESSION };

    const cleanFullName = (fullName || '').trim();
    const cleanNickname = (nickname || '').trim();
    if (!cleanFullName) return { error: 'Nama lengkap wajib diisi.' };
    if (!cleanNickname) return { error: 'Nama panggilan wajib diisi.' };

    const students = this.getStudents();
    const nextNumber = students.length > 0 ? Math.max(...students.map((student) => student.number || 0)) + 1 : 1;
    let memberId: number | undefined;
    let rollingLinkCreated = false;
    try {
      const created = await api.members.create({
        fullName: cleanFullName,
        nickname: cleanNickname,
        role: 'Siswa',
        memberType: 'siswa',
        attendanceNumber: String(nextNumber),
      });
      memberId = created.data.id;
      const response = await api.rollingStudents.create({
        memberId,
        number: nextNumber,
        fullName: cleanFullName,
        nickname: cleanNickname,
        isActive,
      });
      rollingLinkCreated = true;
      const student = fromStudentRow(response.data);
      this.saveStudents([...students, student]);
      return student;
    } catch (err: any) {
      if (memberId && !rollingLinkCreated) {
        try { await api.members.delete(memberId); } catch { /* Preserve the original API error. */ }
      }
      return { error: err?.message || 'Gagal menambahkan siswa ke data anggota.' };
    }
  },

  /**
   * Update canonical identity and the Rolling-only participation flag through
   * the authenticated API. No direct browser writes to Supabase are made.
   */
  async updateStudent(id: string, updates: Partial<SeatingStudent>): Promise<any> {
    if (!isAdminSessionActive()) return { error: NO_SESSION };
    const current = this.getStudentById(id);
    if (!current) return { error: 'Siswa tidak ditemukan.' };
    if (!current.rollingLinked) {
      return { error: 'Data siswa belum terhubung ke daftar Anggota. Periksa migrasi database.' };
    }

    try {
      const response = await api.rollingStudents.update(id, {
        ...(updates.fullName !== undefined ? { fullName: updates.fullName.trim() } : {}),
        ...(updates.nickname !== undefined ? { nickname: updates.nickname.trim() } : {}),
        ...(updates.isActive !== undefined ? { isActive: Boolean(updates.isActive) } : {}),
      });
      const updated = fromStudentRow(response.data);
      this.saveStudents(this.getStudents().map((student) => student.id === id ? updated : student));
      return updated;
    } catch (err: any) {
      return { error: err?.message || 'Gagal memperbarui data siswa.' };
    }
  },

  /** Toggle only the Rolling-specific participation flag. */
  async toggleActive(id: string): Promise<any> {
    const student = this.getStudentById(id);
    if (!student) return { error: 'Siswa tidak ditemukan.' };
    return this.updateStudent(id, { isActive: !student.isActive });
  },

  /**
   * Delete the canonical member. The database archives the identity and
   * deactivates the UUID bridge so existing seating history remains intact.
   */
  async deleteStudent(id: string): Promise<any> {
    if (!isAdminSessionActive()) return { error: NO_SESSION };

    const students = this.getStudents();
    const student = students.find((s) => s.id === id);
    if (!student) return { error: 'Siswa tidak ditemukan.' };

    if (!student.rollingLinked) {
      return { error: 'Data siswa belum terhubung ke daftar Anggota. Periksa migrasi database.' };
    }
    try {
      await api.rollingStudents.remove(id);
    } catch (err: any) {
      return { error: err?.message || 'Gagal menghapus data anggota.' };
    }

    this.saveStudents(students.filter((s) => s.id !== id));
    return true;
  },
};
