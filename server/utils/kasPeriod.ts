/**
 * Real-Time Kas Period & Calculation Engine (Backend / Server)
 * Periode Kas: 1 Oktober 2026 s/d 31 Juli 2027 (44 minggu)
 * Timezone: Asia/Jakarta (WIB / UTC+7)
 */

export interface KasWeekPeriod {
  weekIndex: number;
  label: string;
  startDate: string;
  endDate: string;
  monthKey: string;
  year: number;
}

export function getWIBTodayString(): string {
  const now = new Date();
  const jakartaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const wib = new Date(jakartaStr);
  const y = wib.getFullYear();
  const m = String(wib.getMonth() + 1).padStart(2, '0');
  const d = String(wib.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

    const startDateStr = `${wStart.getFullYear()}-${String(wStart.getMonth() + 1).padStart(2, '0')}-${String(sDay).padStart(2, '0')}`;
    const endDateStr = `${wEnd.getFullYear()}-${String(wEnd.getMonth() + 1).padStart(2, '0')}-${String(eDay).padStart(2, '0')}`;
    const monthKey = `${wStart.getFullYear()}-${String(wStart.getMonth() + 1).padStart(2, '0')}`;

    weeks.push({
      weekIndex: index++,
      label: `Minggu ${index - 1} (${sDay}–${eDay})`,
      startDate: startDateStr,
      endDate: endDateStr,
      monthKey,
      year: wStart.getFullYear(),
    });

    curr.setDate(curr.getDate() + 7);
  }

  return weeks;
}

export function getActiveKasWeekIndex(): number {
  const allWeeks = generateKasWeeks();
  const todayStr = getWIBTodayString();
  const firstWeek = allWeeks[0];
  const lastWeek = allWeeks[allWeeks.length - 1];

  if (firstWeek && todayStr < firstWeek.startDate) return 0;
  if (lastWeek && todayStr > lastWeek.endDate) return allWeeks.length;

  const found = allWeeks.find((w) => todayStr >= w.startDate && todayStr <= w.endDate);
  if (found) return found.weekIndex;

  const pastWeeks = allWeeks.filter((w) => todayStr >= w.startDate);
  return pastWeeks.length > 0 ? pastWeeks[pastWeeks.length - 1].weekIndex : 1;
}
