/**
 * Utility for formatting real-time WIB (UTC+7 / Asia/Jakarta) timestamps
 */
export function formatWIBTime(dateInput: string | Date | number): {
  iso: string;
  wibDate: string; // "2026-10-20"
  wibTime: string; // "13:07:21"
  wibFull: string; // "2026-10-20 13:07:21 WIB"
  wibShort: string; // "[13:07:21 WIB]"
} {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return {
      iso: new Date().toISOString(),
      wibDate: '-',
      wibTime: '-',
      wibFull: '-',
      wibShort: '-',
    };
  }

  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  const hour = partMap.hour || '00';
  const minute = partMap.minute || '00';
  const second = partMap.second || '00';

  const wibDate = `${year}-${month}-${day}`;
  const wibTime = `${hour}:${minute}:${second}`;
  const wibFull = `${wibDate} ${wibTime} WIB`;
  const wibShort = `[${wibTime} WIB]`;

  return {
    iso: d.toISOString(),
    wibDate,
    wibTime,
    wibFull,
    wibShort,
  };
}
