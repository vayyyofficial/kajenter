/**
 * Real-Time Kas Period & Calculation Engine
 * Periode Kas dimulai 1 Oktober 2026 s/d 31 Juli 2027 (44 minggu).
 * Menggunakan tanggal riil dengan Timezone Indonesia/WIB (UTC+7).
 */

export interface KasWeekPeriod {
  weekIndex: number; // 1 to 44
  label: string; // e.g. '1–7 Okt'
  fullDateRange: string; // e.g. '1 Oktober – 7 Oktober 2026'
  startDate: string; // '2026-10-01'
  endDate: string; // '2026-10-07'
  monthKey: string; // '2026-10'
  year: number; // 2026 or 2027
  monthName: string; // 'Oktober 2026'
  monthShort: string; // "Okt '26"
}

export type KasCellStatus = 'paid' | 'unpaid' | 'future';

const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Mendapatkan tanggal saat ini dalam Waktu Indonesia Barat (WIB / UTC+7)
 */
export function getWIBNow(): Date {
  const now = new Date();
  // Gunakan Intl / toLocaleString dengan timeZone Asia/Jakarta
  const jakartaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  return new Date(jakartaStr);
}

/**
 * Mendapatkan string tanggal hari ini format 'YYYY-MM-DD' dalam WIB
 */
export function getWIBTodayString(): string {
  const wib = getWIBNow();
  const y = wib.getFullYear();
  const m = String(wib.getMonth() + 1).padStart(2, '0');
  const d = String(wib.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Menghasilkan daftar periode mingguan Kas dari 1 Oktober 2026 sampai 31 Juli 2027 (44 minggu)
 */
export function generateKasWeeks(): KasWeekPeriod[] {
  const weeks: KasWeekPeriod[] = [];
  const startLocal = new Date(2026, 9, 1); // 1 Okt 2026
  const endLocal = new Date(2027, 6, 31); // 31 Jul 2027

  let curr = new Date(startLocal);
  let index = 1;

  while (curr <= endLocal) {
    const wStart = new Date(curr);
    let wEnd = new Date(curr);
    wEnd.setDate(wEnd.getDate() + 6);
    if (wEnd > endLocal) {
      wEnd = new Date(endLocal);
    }

    const sDay = wStart.getDate();
    const eDay = wEnd.getDate();
    const sMonthShort = MONTHS_SHORT_ID[wStart.getMonth()];
    const eMonthShort = MONTHS_SHORT_ID[wEnd.getMonth()];
    const sMonthFull = MONTHS_FULL_ID[wStart.getMonth()];
    const eMonthFull = MONTHS_FULL_ID[wEnd.getMonth()];

    const label =
      sMonthShort === eMonthShort
        ? `${sDay}–${eDay} ${sMonthShort}`
        : `${sDay} ${sMonthShort}–${eDay} ${eMonthShort}`;

    const fullDateRange =
      sMonthFull === eMonthFull
        ? `${sDay} – ${eDay} ${sMonthFull} ${wStart.getFullYear()}`
        : `${sDay} ${sMonthFull} – ${eDay} ${eMonthFull} ${wEnd.getFullYear()}`;

    const startDateStr = `${wStart.getFullYear()}-${String(wStart.getMonth() + 1).padStart(2, '0')}-${String(sDay).padStart(2, '0')}`;
    const endDateStr = `${wEnd.getFullYear()}-${String(wEnd.getMonth() + 1).padStart(2, '0')}-${String(eDay).padStart(2, '0')}`;
    const monthKey = `${wStart.getFullYear()}-${String(wStart.getMonth() + 1).padStart(2, '0')}`;
    const monthShort = `${sMonthShort} '${String(wStart.getFullYear()).slice(-2)}`;
    const monthName = `${sMonthFull} ${wStart.getFullYear()}`;

    weeks.push({
      weekIndex: index++,
      label,
      fullDateRange,
      startDate: startDateStr,
      endDate: endDateStr,
      monthKey,
      year: wStart.getFullYear(),
      monthName,
      monthShort,
    });

    curr.setDate(curr.getDate() + 7);
  }

  return weeks;
}

/**
 * Menghitung indeks periode minggu yang aktif secara REAL-TIME berdasarkan tanggal hari ini di WIB.
 * Mengembalikan indeks 1-44 jika berada dalam rentang periode Kas.
 * Jika sebelum 1 Okt 2026 -> 0 (belum mulai).
 * Jika setelah 31 Jul 2027 -> 44 (seluruh periode telah selesai).
 */
export function getActiveKasWeekIndex(allWeeks: KasWeekPeriod[] = generateKasWeeks()): number {
  const todayStr = getWIBTodayString();
  const firstWeek = allWeeks[0];
  const lastWeek = allWeeks[allWeeks.length - 1];

  if (firstWeek && todayStr < firstWeek.startDate) {
    return 0; // Belum mulai
  }

  if (lastWeek && todayStr > lastWeek.endDate) {
    return allWeeks.length; // Sudah selesai semua
  }

  const found = allWeeks.find((w) => todayStr >= w.startDate && todayStr <= w.endDate);
  if (found) {
    return found.weekIndex;
  }

  // Jika di antara minggu (fallback ke minggu terdekat yang sudah lewat)
  const pastWeeks = allWeeks.filter((w) => todayStr >= w.startDate);
  return pastWeeks.length > 0 ? pastWeeks[pastWeeks.length - 1].weekIndex : 1;
}

/**
 * Menentukan status pembayaran per cell:
 * - 'paid': Sudah lunas dibayar
 * - 'unpaid': Periode sudah dimulai / lewat, tapi belum bayar (Kewajiban aktif / tunggakan)
 * - 'future': Periode belum dimulai (Bukan tunggakan / bukan hutang)
 */
export function getKasCellStatus(
  isPaid: boolean,
  weekIndex: number,
  activeWeekIndex: number
): KasCellStatus {
  if (isPaid) return 'paid';
  if (weekIndex <= activeWeekIndex) return 'unpaid';
  return 'future';
}
