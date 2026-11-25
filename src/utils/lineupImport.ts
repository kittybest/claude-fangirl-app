import { LineupSlot } from '../types';
import { generateId } from './id';

/** Prompt to paste into any AI chat alongside a festival timetable. */
export const LINEUP_IMPORT_PROMPT = `請把這張音樂節節目表整理成純文字，一行一組演出，格式：
HH:MM-HH:MM | 舞台名稱 | 藝人名稱
只知道開始時間的話寫成：HH:MM | 舞台名稱 | 藝人名稱
過了午夜的時間請寫成 24:10、25:00 這種格式。
舞台和藝人名稱照海報原文，只輸出這些行，不要其他說明。`;

const TIME = String.raw`(\d{1,2}):(\d{2})`;
const LINE = new RegExp(String.raw`^${TIME}(?:\s*[-~]\s*${TIME})?\s*\|\s*([^|]+?)\s*\|\s*(.+)$`);

/** Up to 29:59, so a late-night slot can be written as 25:00. */
function normTime(h: string, m: string): string | null {
  const hh = +h;
  const mm = +m;
  if (hh > 29 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${m}`;
}

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** "25:10" → "01:10（翌日）" */
export function displayTime(t: string): string {
  const mins = timeToMinutes(t);
  if (mins < 24 * 60) return t;
  const h = Math.floor(mins / 60) - 24;
  return `${String(h).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}（翌日）`;
}

export interface LineupImportResult {
  slots: LineupSlot[];
  errors: string[];
}

/**
 * Parses `HH:MM-HH:MM | 舞台 | 藝人` per line; the end time is optional.
 * An end earlier than the start is taken as past midnight.
 */
export function parseLineupImport(text: string): LineupImportResult {
  const slots: LineupSlot[] = [];
  const errors: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(LINE);
    if (!m) { errors.push(line); continue; }
    const [, sh, sm, eh, em, stage, artist] = m;
    const start = normTime(sh, sm);
    let end = eh ? normTime(eh, em) : undefined;
    if (!start || end === null) { errors.push(line); continue; }
    if (end && timeToMinutes(end) <= timeToMinutes(start)) {
      const rolled = timeToMinutes(end) + 24 * 60;
      if (rolled > 29 * 60 + 59) { errors.push(line); continue; }
      end = `${Math.floor(rolled / 60)}:${String(rolled % 60).padStart(2, '0')}`;
    }
    slots.push({ id: generateId(), stage: stage.trim(), start, end, artist: artist.trim() });
  }

  return { slots, errors };
}

export const sortSlots = (slots: LineupSlot[]) =>
  [...slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start) || a.stage.localeCompare(b.stage));

/** Carries stars over to a re-imported timetable by stage + artist. */
export function keepStars(prev: LineupSlot[], next: LineupSlot[]): LineupSlot[] {
  const key = (s: LineupSlot) => `${s.stage.toLowerCase()}|${s.artist.toLowerCase()}`;
  const starred = new Set(prev.filter(s => s.starred).map(key));
  return next.map(s => (starred.has(key(s)) ? { ...s, starred: true } : s));
}
