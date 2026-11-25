/** Prompt to paste into any AI chat alongside a tour poster. */
export const SERIES_IMPORT_PROMPT = `請把這張巡演海報整理成純文字，一行一個城市的場次，格式：
YYYY-MM-DD 城市
連續多天寫成：YYYY-MM-DD~MM-DD 城市
年份請寫完整（從海報標題或上下文判斷），城市用繁體中文，
只輸出這些行，不要其他說明。`;

/** Longest range a single line may expand to, so a typo can't create hundreds of rows. */
const MAX_RANGE_DAYS = 31;

const DATE = String.raw`(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})`;
const END = String.raw`(?:(\d{4})[-/.])?(\d{1,2})[-/.](\d{1,2})`;
const LINE = new RegExp(String.raw`^${DATE}(?:\s*~\s*${END})?\s+(.+)$`);

export interface SeriesImportResult {
  items: { date: string; venue: string }[];
  errors: { line: number; text: string }[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Returns a UTC date only if y/m/d is a real calendar day. */
function makeDate(y: number, m: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

const toStr = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/**
 * Parses one show per line: `YYYY-MM-DD 城市`, or `YYYY-MM-DD~MM-DD 城市`
 * which expands to every day in the range. A range end without a year that
 * falls before the start rolls into the next year.
 */
export function parseSeriesImport(text: string): SeriesImportResult {
  const items: SeriesImportResult['items'] = [];
  const errors: SeriesImportResult['errors'] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const m = line.match(LINE);
    const fail = () => errors.push({ line: i + 1, text: line });
    if (!m) return fail();

    const [, y, mo, d, ey, emo, ed, venueRaw] = m;
    const start = makeDate(+y, +mo, +d);
    if (!start) return fail();

    let end = start;
    if (emo) {
      let endYear = ey ? +ey : +y;
      let e = makeDate(endYear, +emo, +ed);
      if (e && !ey && e < start) {
        endYear += 1;
        e = makeDate(endYear, +emo, +ed);
      }
      if (!e || e < start) return fail();
      end = e;
    }

    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > MAX_RANGE_DAYS) return fail();

    const venue = venueRaw.trim();
    for (let k = 0; k < days; k++) {
      items.push({ date: toStr(new Date(start.getTime() + k * 86400000)), venue });
    }
  });

  return { items, errors };
}
