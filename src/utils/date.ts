export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function toLocalDatetime(isoString: string, fromTimezone: string): Date {
  const d = new Date(isoString);
  const localStr = d.toLocaleString('en-US', { timeZone: fromTimezone });
  return new Date(localStr);
}

export function convertToLocalDisplay(datetime: string, timezone: string): { date: string; time: string } {
  const utcDate = new Date(`${datetime}${timezone === 'UTC' ? 'Z' : ''}`);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return { date: formatter.format(utcDate), time: timeFormatter.format(utcDate) };
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];
export function weekdayZh(date: Date): string {
  return WEEKDAY_ZH[date.getDay()];
}
