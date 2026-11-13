/**
 * CLASS ROLLING - Seating Arrangement & Reroll Service
 *
 * Seating assignments and history are publicly viewable by students.
 * Admin actions (manual reroll) require admin authentication via the website.
 *
 * Weekly automatic rerolls are executed server-side via pg_cron (Sundays at 06:00 WIB).
 * The browser NEVER triggers automated rerolls on cycle transition.
 */

import { seatingStorageService } from './seatingStorageService';
import { seatingLayoutService } from './seatingLayoutService';
import { seatingStudentService } from './seatingStudentService';
import { isAdminSessionActive } from './adminSession';
import { generateSeatingArrangement } from '../utils/seatingRandomizer';
import { getWeeklyCycleId } from '../utils/seatingScheduler';
import { formatWIBDateTime } from '../utils/seatingTimezone';
import { seatingSupabase, isSupabaseConfigured } from './seatingSupabase';

const STORAGE_KEYS = {
  CURRENT_ARRANGEMENT: 'seating_current',
  HISTORY: 'seating_history',
  LAST_CYCLE_ID: 'seating_last_cycle_id',
  PREVIOUS_ARRANGEMENT: 'seating_previous',
};

export interface SeatingArrangement {
  assignments: Record<string, string>;
  emptySeatIds: string[];
  updatedAt: string;
  type: string;
  cycleId: string;
  activeStudentCount: number;
}

export interface SeatingHistoryItem {
  id: string;
  timestamp: string;
  wibFormatted: string;
  type: string;
  description: string;
  activeStudentCount: number;
  cycleId: string;
}

export const seatingArrangementService = {
  /**
   * Returns the cached active seating arrangement for immediate rendering.
   * If cache is empty, provides a clean initial layout without faking database records.
   */
  getCurrentArrangement(): SeatingArrangement {
    const arrangement = seatingStorageService.get<SeatingArrangement>(STORAGE_KEYS.CURRENT_ARRANGEMENT, null);

    if (arrangement && arrangement.assignments) {
      return arrangement;
    }

    // Clean initial fallback state for immediate offline/cold-start UI display
    const layout = seatingLayoutService.getLayout();
    const students = seatingStudentService.getStudents();
    const activeStudents = (students || []).filter((s) => s.isActive);
    const { assignments, emptySeatIds, timestamp } = generateSeatingArrangement(
      layout,
      (students || []).filter((s) => s.rollingLinked !== false),
    );
    const currentCycleId = getWeeklyCycleId();

    const fallbackArrangement: SeatingArrangement = {
      assignments,
      emptySeatIds,
      updatedAt: timestamp,
      type: 'Inisialisasi',
      cycleId: currentCycleId,
      activeStudentCount: activeStudents.length,
    };

    seatingStorageService.set(STORAGE_KEYS.CURRENT_ARRANGEMENT, fallbackArrangement);
    return fallbackArrangement;
  },

  /**
   * Fetch active arrangement from Supabase get_active_seating RPC.
   * Updates local cache upon successful fetch.
   */
  async fetchActiveArrangement(): Promise<SeatingArrangement> {
    if (!isSupabaseConfigured) {
      return this.getCurrentArrangement();
    }

    try {
      const { data, error } = await seatingSupabase.rpc('get_active_seating');

      if (!error && data && data.active && data.assignments) {
        const arrangement: SeatingArrangement = {
          assignments: data.assignments,
          emptySeatIds: data.empty_seat_ids || [],
          updatedAt: data.created_at,
          type:
            data.roll_type === 'automatic'
              ? 'Otomatis'
              : data.roll_type === 'manual'
              ? 'Manual'
              : 'Inisialisasi',
          cycleId: data.cycle_id,
          activeStudentCount: Object.keys(data.assignments).length,
        };
        seatingStorageService.set(STORAGE_KEYS.CURRENT_ARRANGEMENT, arrangement);
        return arrangement;
      }
    } catch (err) {
      console.warn('[seatingArrangementService] get_active_seating error, using cached data:', err);
    }

    return this.getCurrentArrangement();
  },

  /**
   * Returns previous arrangement for visual comparison.
   */
  getPreviousArrangement(): SeatingArrangement | null {
    return seatingStorageService.get<SeatingArrangement>(STORAGE_KEYS.PREVIOUS_ARRANGEMENT, null);
  },

  /**
   * Passive cycle check on client-side:
   * Detects weekly cycle transition and refreshes active arrangement from the server.
   */
  async checkAndRunScheduledReroll(): Promise<SeatingArrangement | null> {
    const currentCycleId = getWeeklyCycleId();
    const lastCycleId = seatingStorageService.get<string>(STORAGE_KEYS.LAST_CYCLE_ID, null);

    if (lastCycleId && lastCycleId !== currentCycleId) {
      seatingStorageService.set(STORAGE_KEYS.LAST_CYCLE_ID, currentCycleId);
      return await this.fetchActiveArrangement();
    }

    if (!lastCycleId) {
      seatingStorageService.set(STORAGE_KEYS.LAST_CYCLE_ID, currentCycleId);
    }

    return null;
  },

  /**
   * Generates a local seating arrangement and saves to cache/history.
   */
  executeLocalReroll(dbType = 'manual', description = ''): SeatingArrangement {
    const layout = seatingLayoutService.getLayout();
    const students = seatingStudentService.getStudents();
    const activeStudents = (students || []).filter((s) => s.isActive);
    const { assignments, emptySeatIds, timestamp } = generateSeatingArrangement(
      layout,
      (students || []).filter((s) => s.rollingLinked !== false),
    );
    const currentCycleId = getWeeklyCycleId();

    const previous = this.getCurrentArrangement();
    if (previous) {
      seatingStorageService.set(STORAGE_KEYS.PREVIOUS_ARRANGEMENT, previous);
    }

    const newArrangement: SeatingArrangement = {
      assignments,
      emptySeatIds,
      updatedAt: timestamp,
      type: dbType === 'automatic' ? 'Otomatis' : 'Manual',
      cycleId: currentCycleId,
      activeStudentCount: activeStudents.length,
    };

    seatingStorageService.set(STORAGE_KEYS.CURRENT_ARRANGEMENT, newArrangement);

    const historyItem: SeatingHistoryItem = {
      id: `local-${Date.now()}`,
      timestamp,
      wibFormatted: formatWIBDateTime(timestamp),
      type: dbType === 'automatic' ? 'Otomatis' : 'Manual',
      description: description || (dbType === 'automatic' ? 'Rotasi Otomatis' : 'Pengacakan Manual oleh Admin'),
      activeStudentCount: activeStudents.length,
      cycleId: currentCycleId,
    };

    const existingHistory = this.getHistory();
    seatingStorageService.set(STORAGE_KEYS.HISTORY, [historyItem, ...existingHistory]);

    return newArrangement;
  },

  /**
   * Execute seating reroll on the database or locally if offline.
   */
  async executeRerollAsync(type = 'Manual', description = ''): Promise<any> {
    if (!isAdminSessionActive()) {
      return {
        error: 'Sesi administrator tidak aktif. Silakan masuk kembali.',
      };
    }

    const dbType =
      type === 'Otomatis'
        ? 'automatic'
        : type === 'Inisialisasi'
        ? 'initial'
        : 'manual';

    const desc =
      description ||
      (dbType === 'manual'
        ? 'Pengacakan Manual oleh Admin'
        : 'Pengacakan Otomatis Mingguan');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await seatingSupabase.rpc('execute_seating_reroll', {
          p_roll_type: dbType,
          p_description: desc,
        });

        if (!error && data?.success) {
          const latest = await this.fetchActiveArrangement();
          return latest;
        }

        if (error) {
          console.warn('[seatingArrangementService] execute_seating_reroll RPC error, using local fallback:', error.message);
        }
      } catch (err) {
        console.warn('[seatingArrangementService] execute_seating_reroll exception, using local fallback:', err);
      }
    }

    return this.executeLocalReroll(dbType, desc);
  },

  /**
   * Get activity history from local cache
   */
  getHistory(): SeatingHistoryItem[] {
    return seatingStorageService.get<SeatingHistoryItem[]>(STORAGE_KEYS.HISTORY, []) || [];
  },

  /**
   * Async fetch history from Supabase reroll_history table with local fallback
   */
  async fetchHistory(): Promise<SeatingHistoryItem[]> {
    if (!isSupabaseConfigured) {
      return this.getHistory();
    }

    try {
      const { data, error } = await seatingSupabase
        .from('reroll_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const mapped: SeatingHistoryItem[] = data.map((h: any) => ({
          id: h.id,
          timestamp: h.created_at,
          wibFormatted: formatWIBDateTime(h.created_at),
          type:
            h.roll_type === 'automatic'
              ? 'Otomatis'
              : h.roll_type === 'manual'
              ? 'Manual'
              : 'Inisialisasi',
          description: h.description,
          activeStudentCount: h.active_student_count,
          cycleId: h.cycle_id,
        }));
        seatingStorageService.set(STORAGE_KEYS.HISTORY, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[seatingArrangementService] Supabase fetch history error:', err);
    }
    return this.getHistory();
  },

  clearHistory(): boolean {
    seatingStorageService.set(STORAGE_KEYS.HISTORY, []);
    return true;
  },

  /**
   * Supabase Realtime listener for live seating updates across student devices
   */
  subscribeToSeatingChanges(onUpdate: (latest: SeatingArrangement) => void): () => void {
    if (!isSupabaseConfigured) {
      return () => {};
    }

    try {
      const channel = seatingSupabase
        .channel('public:seating_periods')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'seating_periods' },
          async () => {
            const latest = await this.fetchActiveArrangement();
            if (latest && onUpdate) onUpdate(latest);
          }
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
