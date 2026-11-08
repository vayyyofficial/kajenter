/**
 * CLASS ROLLING - Group Randomizer Service
 * Independent classroom utility for subject assignments, projects, and activities.
 * Generates balanced, unbiased groups and supports permanent saving with subject & submitter metadata.
 */

import { seatingSupabase } from "./seatingSupabase";
import { seatingStorageService } from "./seatingStorageService";
import { seatingStudentService } from "./seatingStudentService";
import { shuffleArray } from "../utils/seatingRandomizer";

const STORAGE_KEYS = {
  CURRENT_UNSAVED: "current_unsaved_groups",
  SAVED_GROUPS_LIST: "saved_class_groups_list",
};

export interface GroupMember {
  id: string;
  number: number;
  fullName: string;
  nickname: string;
}

export interface GeneratedGroup {
  groupNumber: number;
  name: string;
  members: GroupMember[];
}

export interface GroupGeneration {
  id: string;
  createdAt: string;
  numGroups: number;
  studentCount: number;
  groups: GeneratedGroup[];
  isSaved: boolean;
  category?: string;
  subject?: string;
  submittedByStudentId?: string;
  submittedByName?: string;
}

export const seatingGroupService = {
  /**
   * Generates a new, balanced randomization of students.
   * This is in-memory / unsaved until the user explicitly saves it.
   */
  generateGroups(numGroups = 4): GroupGeneration {
    if (numGroups < 2 || numGroups > 26) {
      throw new Error("Jumlah kelompok harus antara 2 dan 26 kelompok.");
    }

    const students = seatingStudentService.getStudents();
    const activeStudents = students.filter((s) => s.isActive !== false);

    if (activeStudents.length < numGroups) {
      throw new Error(
        `Jumlah siswa aktif (${activeStudents.length}) kurang dari ${numGroups} kelompok.`,
      );
    }

    // Unbiased Fisher-Yates shuffle
    const shuffled = shuffleArray(activeStudents);

    // Initialize groups
    const groups: GeneratedGroup[] = Array.from(
      { length: numGroups },
      (_, i) => ({
        groupNumber: i + 1,
        name: `Kelompok ${i + 1}`,
        members: [],
      }),
    );

    // Round-robin distribution for perfectly balanced group sizes
    shuffled.forEach((student, index) => {
      const groupIndex = index % numGroups;
      groups[groupIndex].members.push({
        id: student.id,
        number: student.number,
        fullName: student.fullName,
        nickname: student.nickname,
      });
    });

    const generation: GroupGeneration = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      numGroups,
      studentCount: activeStudents.length,
      groups,
      isSaved: false,
    };

    // Store as current working generation
    seatingStorageService.set(STORAGE_KEYS.CURRENT_UNSAVED, generation);

    return generation;
  },

  /**
   * Get the current active working generation (if any)
   */
  getCurrentUnsaved(): GroupGeneration | null {
    return seatingStorageService.get<GroupGeneration>(
      STORAGE_KEYS.CURRENT_UNSAVED,
      null,
    );
  },

  /**
   * Save group results with category, subject, and submitter.
   * Never overwrites previously saved groups.
   */
  async saveGroup({
    category = "Tugas Kelompok",
    subject,
    submittedByStudentId,
    submittedByName,
    numGroups,
    studentCount,
    groups,
  }: {
    category?: string;
    subject: string;
    submittedByStudentId?: string;
    submittedByName: string;
    numGroups: number;
    studentCount: number;
    groups: GeneratedGroup[];
  }): Promise<GroupGeneration> {
    if (!subject || !subject.trim()) {
      throw new Error("Mata pelajaran wajib diisi.");
    }
    if (!submittedByName || !submittedByName.trim()) {
      throw new Error("Nama penyimpan (siswa) wajib dipilih.");
    }

    const cleanSubject = subject.trim();
    const cleanCategory = category.trim();
    const nowIso = new Date().toISOString();

    const recordPayload = {
      category: cleanCategory,
      subject: cleanSubject,
      submitted_by_student_id: submittedByStudentId || null,
      submitted_by_name: submittedByName.trim(),
      num_groups: numGroups,
      student_count: studentCount,
      groups_data: groups,
      created_at: nowIso,
    };

    // 1. Try saving to Supabase table
    let savedId = `saved-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    try {
      const { data, error } = await seatingSupabase
        .from("saved_class_groups")
        .insert(recordPayload)
        .select()
        .single();

      if (!error && data?.id) {
        savedId = data.id;
      }
    } catch (err) {
      console.warn(
        "[seatingGroupService] Supabase save error, storing locally:",
        err,
      );
    }

    const savedRecord: GroupGeneration = {
      id: savedId,
      category: cleanCategory,
      subject: cleanSubject,
      submittedByStudentId,
      submittedByName: submittedByName.trim(),
      numGroups,
      studentCount,
      groups,
      createdAt: nowIso,
      isSaved: true,
    };

    // 2. Add to local saved groups list (prepend so newest is first)
    const localList =
      seatingStorageService.get<GroupGeneration[]>(
        STORAGE_KEYS.SAVED_GROUPS_LIST,
        [],
      ) || [];
    const updatedList = [
      savedRecord,
      ...localList.filter((item) => item.id !== savedId),
    ];
    seatingStorageService.set(STORAGE_KEYS.SAVED_GROUPS_LIST, updatedList);

    // Update current working generation as saved
    seatingStorageService.set(STORAGE_KEYS.CURRENT_UNSAVED, savedRecord);

    return savedRecord;
  },

  /**
   * Retrieve list of all previously saved groups.
   * Combines Supabase records with local storage cache.
   */
  async fetchSavedGroups(): Promise<GroupGeneration[]> {
    try {
      const { data, error } = await seatingSupabase
        .from("saved_class_groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: GroupGeneration[] = data.map((item: any) => ({
          id: item.id,
          category: item.category || "Tugas Kelompok",
          subject: item.subject,
          submittedByStudentId: item.submitted_by_student_id,
          submittedByName: item.submitted_by_name,
          numGroups: item.num_groups,
          studentCount: item.student_count,
          groups: item.groups_data || [],
          createdAt: item.created_at,
          isSaved: true,
        }));

        seatingStorageService.set(STORAGE_KEYS.SAVED_GROUPS_LIST, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn(
        "[seatingGroupService] Supabase fetch saved groups error:",
        err,
      );
    }

    return (
      seatingStorageService.get<GroupGeneration[]>(
        STORAGE_KEYS.SAVED_GROUPS_LIST,
        [],
      ) || []
    );
  },

  /**
   * Delete a saved group record
   */
  async deleteSavedGroup(id: string): Promise<boolean> {
    try {
      await seatingSupabase.from("saved_class_groups").delete().eq("id", id);
    } catch {
      // Ignore network errors
    }

    const localList =
      seatingStorageService.get<GroupGeneration[]>(
        STORAGE_KEYS.SAVED_GROUPS_LIST,
        [],
      ) || [];
    const filtered = localList.filter((item) => item.id !== id);
    seatingStorageService.set(STORAGE_KEYS.SAVED_GROUPS_LIST, filtered);
    return true;
  },

  /**
   * Format group results into clean text for copying to WhatsApp / chat
   */
  formatGroupsForCopy(generation: GroupGeneration): string {
    if (!generation || !generation.groups) return "";

    const lines = [`*HASIL PEMBAGIAN KELOMPOK — ROLLING SEAT*`];

    if (generation.subject) {
      lines.push(`📚 Mata Pelajaran: *${generation.subject}*`);
    }
    if (generation.category) {
      lines.push(`📌 Kategori: ${generation.category}`);
    }
    if (generation.submittedByName) {
      lines.push(`👤 Disimpan Oleh: ${generation.submittedByName}`);
    }

    lines.push(
      `📅 Waktu: ${new Date(generation.createdAt).toLocaleDateString("id-ID", { dateStyle: "full" })}`,
      `👥 Total: ${generation.studentCount} Siswa | ${generation.numGroups} Kelompok`,
      `────────────────────────────`,
    );

    generation.groups.forEach((g) => {
      lines.push(`\n*${g.name}* (${g.members.length} Siswa):`);
      g.members.forEach((m, idx) => {
        lines.push(`${idx + 1}. ${m.nickname} (${m.fullName})`);
      });
    });

    lines.push(`\n_Dibuat via Rolling Seat_`);
    return lines.join("\n");
  },

  /**
   * Subscribe to Realtime updates for saved class groups
   */
  subscribeToSavedGroups(
    onUpdate: (latest: GroupGeneration[]) => void,
  ): () => void {
    try {
      const channel = seatingSupabase
        .channel("public:saved_class_groups")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "saved_class_groups" },
          async () => {
            const latest = await seatingGroupService.fetchSavedGroups();
            if (onUpdate) onUpdate(latest);
          },
        )
        .subscribe();

      return () => {
        seatingSupabase.removeChannel(channel);
      };
    } catch {
      return () => {};
    }
  },
};
