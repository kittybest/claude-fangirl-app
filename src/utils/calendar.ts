import { ShowLink } from '../types';

/** 沒有結束時間欄位，預設兩小時 */
const DEFAULT_DURATION_MINUTES = 120;

export interface IcsShowInput {
  id?: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  timezone?: string;
  artists?: string[];
  venue?: string;
  venueUrl?: string;
  seat?: string;
  notes?: string;
  links?: ShowLink[];
}

/** 該時區在某個瞬間相對 UTC 的偏移量 (ms) */
function tzOffsetMs(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - timestamp;
}

/** 把「某時區的牆上時間」換算成真正的 UTC 瞬間 */
function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let ts = wall - tzOffsetMs(wall, timeZone);
  // 日光節約交界時第一次推算的偏移量可能取錯，用結果再校正一次
  const refined = wall - tzOffsetMs(ts, timeZone);
  if (refined !== ts) ts = refined;
  return new Date(ts);
}

function formatUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDateOnly(date: string): string {
  return date.replace(/-/g, '');
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** RFC 5545 規定每行最多 75 octets，超過要折行；不可切斷多位元組字元 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      out.push(current);
      current = char;
      bytes = size + 1; // 續行開頭的空白也算一個 octet
      limit = 75;
    } else {
      current += char;
      bytes += size;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

export function buildShowIcs(input: IcsShowInput): string {
  const timezone = input.timezone ?? 'Asia/Taipei';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//fangirl-app//Show//ZH-TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.id ?? crypto.randomUUID()}@fangirl-app`,
    `DTSTAMP:${formatUtc(new Date())}`,
  ];

  if (input.time) {
    const start = zonedTimeToUtc(input.date, input.time, timezone);
    const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
    lines.push(`DTSTART:${formatUtc(start)}`, `DTEND:${formatUtc(end)}`);
  } else {
    lines.push(
      `DTSTART;VALUE=DATE:${formatDateOnly(input.date)}`,
      `DTEND;VALUE=DATE:${formatDateOnly(addDays(input.date, 1))}`,
    );
  }

  lines.push(`SUMMARY:${escapeText(input.title)}`);
  if (input.venue) lines.push(`LOCATION:${escapeText(input.venue)}`);
  if (input.venueUrl) lines.push(`URL:${escapeText(input.venueUrl)}`);

  const description: string[] = [];
  if (input.artists?.length) description.push(`演出者: ${input.artists.join(', ')}`);
  if (input.seat) description.push(`座位: ${input.seat}`);
  if (input.notes) description.push(input.notes);
  input.links?.forEach(link => description.push(`${link.label}: ${link.url}`));
  if (description.length) lines.push(`DESCRIPTION:${escapeText(description.join('\n'))}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');
  // 檔案結尾需要一個 CRLF，部分行事曆解析器會挑剔
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

function safeFilename(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, '').trim();
  return `${cleaned || 'show'}.ics`;
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    window.open(url, '_blank');
  }
  // iOS 需要一點時間讀取，太早 revoke 會拿到空檔案
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function downloadShowIcs(input: IcsShowInput): void {
  downloadIcs(safeFilename(input.title), buildShowIcs(input));
}
