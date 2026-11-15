/**
 * CLASS ROLLING - Validation Utilities
 */

import { ClassroomLayout } from '../data/seatingLayout';

export interface StudentValidation {
  isValid: boolean;
  errors: {
    fullName?: string;
    nickname?: string;
  };
}

/**
 * Validates student data
 */
export function validateStudent(student: { fullName?: string; nickname?: string }): StudentValidation {
  const errors: { fullName?: string; nickname?: string } = {};

  if (!student.fullName || !student.fullName.trim()) {
    errors.fullName = 'Nama lengkap wajib diisi.';
  } else if (student.fullName.trim().length < 2) {
    errors.fullName = 'Nama lengkap minimal 2 karakter.';
  }

  if (!student.nickname || !student.nickname.trim()) {
    errors.nickname = 'Nama panggilan (nickname) wajib diisi.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface LayoutValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalSeats: number;
  availableSeats: number;
}

/**
 * Validates classroom layout integrity
 */
export function validateLayout(layout: ClassroomLayout | null, activeStudentCount = 0): LayoutValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!layout || !layout.blocks || !Array.isArray(layout.blocks) || layout.blocks.length === 0) {
    errors.push('Tata letak harus memiliki minimal satu blok meja.');
    return { isValid: false, errors, warnings, totalSeats: 0, availableSeats: 0 };
  }

  const seatIds = new Set<string>();
  const seatCodes = new Set<string>();
  let totalSeats = 0;
  let availableSeats = 0;

  layout.blocks.forEach((block, bIdx) => {
    if (!block.name || !block.name.trim()) {
      errors.push(`Blok #${bIdx + 1} harus memiliki nama.`);
    }

    if (block.rows < 1 || block.cols < 1) {
      errors.push(`Blok "${block.name || bIdx + 1}" harus memiliki minimal 1 baris dan 1 kolom.`);
    }

    if (!Array.isArray(block.seats)) {
      errors.push(`Daftar kursi pada blok "${block.name}" tidak valid.`);
      return;
    }

    block.seats.forEach((seat) => {
      totalSeats++;
      if (seat.isAvailable) availableSeats++;

      if (seatIds.has(seat.id)) {
        errors.push(`ID kursi ganda ditemukan: ${seat.id}`);
      }
      seatIds.add(seat.id);

      if (seat.code) {
        if (seatCodes.has(seat.code)) {
          warnings.push(`Nomor/kode kursi "${seat.code}" terduplikasi pada blok lain.`);
        }
        seatCodes.add(seat.code);
      }
    });
  });

  if (availableSeats < activeStudentCount) {
    errors.push(
      `Kapasitas kursi tersedia (${availableSeats}) kurang dari jumlah siswa aktif (${activeStudentCount}). Tambahkan kursi atau aktifkan kembali kursi nonaktif.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalSeats,
    availableSeats,
  };
}
