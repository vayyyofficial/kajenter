/**
 * CLASS ROLLING - Fisher-Yates Randomization Engine
 * Unbiased seating shuffle and assignment algorithm
 */

import { ClassroomLayout, SeatingSeat } from '../data/seatingLayout';
import { SeatingStudent } from '../data/seatingStudents';

/**
 * Standard unbiased Fisher-Yates (Knuth) Shuffle
 * Returns a new shuffled array without mutating the original.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface SeatingArrangementResult {
  assignments: Record<string, string>;
  emptySeatIds: string[];
  timestamp: string;
}

/**
 * Generate a new seating assignment given a layout and student list.
 */
export function generateSeatingArrangement(
  layout: ClassroomLayout,
  students: SeatingStudent[]
): SeatingArrangementResult {
  // 1. Filter active students
  const activeStudents = (students || []).filter((s) => s.isActive);

  // 2. Collect all available seats across all blocks
  const allSeats: SeatingSeat[] = [];
  layout.blocks.forEach((block) => {
    block.seats.forEach((seat) => {
      if (seat.isAvailable) {
        allSeats.push(seat);
      }
    });
  });

  // Separate seats into normal available seats and designated empty seats
  const normalSeats = allSeats.filter((s) => !s.defaultEmpty);
  const preferredEmptySeats = allSeats.filter((s) => s.defaultEmpty);

  // Pool of candidate seats to fill
  // Prefer filling normal seats first, then preferredEmptySeats if needed
  const assignableSeats = [...normalSeats];
  if (assignableSeats.length < activeStudents.length) {
    const needed = activeStudents.length - assignableSeats.length;
    assignableSeats.push(...preferredEmptySeats.slice(0, needed));
  }

  // Shuffle active students
  const shuffledStudents = shuffleArray(activeStudents);

  // Shuffle assignable seat slots so students get placed randomly
  const shuffledSeats = shuffleArray(assignableSeats);

  const assignments: Record<string, string> = {};
  const assignedSeatIds = new Set<string>();

  shuffledStudents.forEach((student, index) => {
    if (index < shuffledSeats.length) {
      const seat = shuffledSeats[index];
      assignments[seat.id] = student.id;
      assignedSeatIds.add(seat.id);
    }
  });

  // Remaining seats are marked as empty
  const emptySeatIds = allSeats
    .filter((seat) => !assignedSeatIds.has(seat.id))
    .map((seat) => seat.id);

  return {
    assignments,
    emptySeatIds,
    timestamp: new Date().toISOString(),
  };
}
