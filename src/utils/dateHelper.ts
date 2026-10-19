/**
 * Helper utilities for formatting dates and calculating task deadline proximities.
 * Uses Indonesia / WIB standard and locale formatting.
 */

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format YYYY-MM-DD to readable Indonesian format: "Senin, 21 Oktober 2026"
 */
export function formatIndonesianDate(dateStr: string | null | undefined, includeDay: boolean = true): string {
  if (!dateStr) return '-';
  try {
    const parts = String(dateStr).trim().split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const dayName = INDO_DAYS[d.getDay()];
      const monthName = INDO_MONTHS[month];

      if (includeDay && dayName) {
        return `${dayName}, ${day} ${monthName} ${year}`;
      }
      return `${day} ${monthName} ${year}`;
    }
  } catch {
    // Fallback
  }
  return String(dateStr);
}

export interface DeadlineProximity {
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  isPast: boolean;
  isUrgent: boolean;
  diffDays: number;
}

/**
 * Calculates deadline proximity relative to current date (in WIB / Local time)
 */
export function getDeadlineProximity(deadlineDateStr: string | null | undefined): DeadlineProximity {
  if (!deadlineDateStr) {
    return { label: '-', isToday: false, isTomorrow: false, isPast: false, isUrgent: false, diffDays: 0 };
  }

  try {
    const parts = String(deadlineDateStr).trim().split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const target = new Date(year, month, day);
      target.setHours(0, 0, 0, 0);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          label: 'Sudah Lewat',
          isToday: false,
          isTomorrow: false,
          isPast: true,
          isUrgent: false,
          diffDays,
        };
      } else if (diffDays === 0) {
        return {
          label: 'Hari Ini',
          isToday: true,
          isTomorrow: false,
          isPast: false,
          isUrgent: true,
          diffDays: 0,
        };
      } else if (diffDays === 1) {
        return {
          label: 'Besok (H-1)',
          isToday: false,
          isTomorrow: true,
          isPast: false,
          isUrgent: true,
          diffDays: 1,
        };
      } else {
        return {
          label: `Tersisa ${diffDays} hari`,
          isToday: false,
          isTomorrow: false,
          isPast: false,
          isUrgent: diffDays <= 3,
          diffDays,
        };
      }
    }
  } catch {
    // Fallback
  }

  return { label: '-', isToday: false, isTomorrow: false, isPast: false, isUrgent: false, diffDays: 0 };
}
