import { Currency, Show, ShowCategory, Venue } from '../types';
import { SHOW_CATEGORIES } from './constants';
import { buildVenueIndex, displayVenue } from './venues';

export interface SummaryRow {
  date: string; // MM/DD
  title: string;
  place: string;
  price: string;
}

export interface SummaryGroup {
  category: ShowCategory;
  label: string;
  count: number;
  spentTWD: number;
  rows: SummaryRow[];
}

export interface Summary {
  title: string;
  count: number;
  spentTWD: number;
  groups: SummaryGroup[];
}

const CURRENCY_PREFIX: Record<Currency, string> = {
  TWD: 'NT$',
  JPY: '¥',
  KRW: '₩',
  CNY: 'CN¥',
  USD: 'US$',
};

const ntd = (amount: number) => `NT$${amount.toLocaleString()}`;

export const categoryLabel = (category: ShowCategory) =>
  SHOW_CATEGORIES.find(c => c.value === category)?.label || category;

function formatPrice(show: Show): string {
  const currency = show.ticketCurrency || 'TWD';
  if (show.ticketPrice === undefined || show.ticketPrice === null) {
    return show.ticketPriceTWD ? ntd(show.ticketPriceTWD) : '-';
  }
  if (currency === 'TWD') return ntd(show.ticketPrice);
  const original = `${CURRENCY_PREFIX[currency]}${show.ticketPrice.toLocaleString()}`;
  return show.ticketPriceTWD ? `${original}（${ntd(show.ticketPriceTWD)}）` : original;
}

export function summaryTitle(year: number, month: number | null): string {
  return month === null ? `${year} 演出紀錄` : `${year}年${month}月 演出紀錄`;
}

export function summaryFileBase(year: number, month: number | null): string {
  return month === null ? `${year}-演出紀錄` : `${year}-${String(month).padStart(2, '0')}-演出紀錄`;
}

/** Ticket prices only; other expenses are left out on purpose. */
export function buildSummary(
  shows: Show[],
  venues: Venue[],
  opts: { year: number; month: number | null; categories: ShowCategory[] },
): Summary {
  const venueIndex = buildVenueIndex(venues);
  const byCategory = new Map<ShowCategory, Show[]>();
  for (const show of shows) {
    const category = show.category || 'other';
    if (!opts.categories.includes(category)) continue;
    byCategory.set(category, [...(byCategory.get(category) || []), show]);
  }

  const groups: SummaryGroup[] = [...byCategory].map(([category, list]) => {
    const sorted = [...list].sort((a, b) =>
      a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    return {
      category,
      label: categoryLabel(category),
      count: sorted.length,
      spentTWD: sorted.reduce((sum, s) => sum + (s.ticketPriceTWD || 0), 0),
      rows: sorted.map(s => {
        return {
          date: `${s.date.slice(5, 7)}/${s.date.slice(8, 10)}`,
          title: s.title,
          place: displayVenue(venueIndex, s)?.name ?? '',
          price: formatPrice(s),
        };
      }),
    };
  });
  groups.sort((a, b) => b.count - a.count || b.spentTWD - a.spentTWD);

  return {
    title: summaryTitle(opts.year, opts.month),
    count: groups.reduce((sum, g) => sum + g.count, 0),
    spentTWD: groups.reduce((sum, g) => sum + g.spentTWD, 0),
    groups,
  };
}

export interface RenderOptions {
  showPrice: boolean;
}

const headline = (summary: Summary, o: RenderOptions) =>
  o.showPrice ? `共 ${summary.count} 場 · 票價 ${ntd(summary.spentTWD)}` : `共 ${summary.count} 場`;
const breakdown = (summary: Summary) => summary.groups.map(g => `${g.label} ${g.count}`).join(' · ');
const groupHeading = (g: SummaryGroup, o: RenderOptions) =>
  o.showPrice ? `${g.count} 場 · ${ntd(g.spentTWD)}` : `${g.count} 場`;

export function summaryToText(summary: Summary, o: RenderOptions): string {
  const lines = [summary.title, headline(summary, o)];
  if (summary.groups.length > 1) lines.push(breakdown(summary));
  for (const g of summary.groups) {
    lines.push('', `【${g.label}】${groupHeading(g, o)}`);
    for (const r of g.rows) {
      lines.push([`${r.date} ${r.title}`, r.place, o.showPrice ? r.price : ''].filter(Boolean).join('｜'));
    }
  }
  return lines.join('\n');
}

const FONT = '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const COLORS = {
  bg: '#ffffff',
  accent: '#9333ea', // purple-600
  accentSoft: '#f3e8ff', // purple-100
  text: '#1f2937', // gray-800
  sub: '#6b7280', // gray-500
  faint: '#9ca3af', // gray-400
  rule: '#f3f4f6', // gray-100
};

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + '…';
}

export function summaryToImage(summary: Summary, o: RenderOptions): Promise<Blob> {
  const W = 1080;
  const PAD = 72;
  const ROW_H = 104;
  const GROUP_HEAD_H = 120;
  const HEADER_H = summary.groups.length > 1 ? 300 : 250;
  const FOOTER_H = 80;
  const rowCount = summary.groups.reduce((sum, g) => sum + g.rows.length, 0);
  const H = HEADER_H + summary.groups.length * GROUP_HEAD_H + rowCount * ROW_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas not supported'));

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Header
  let y = PAD + 56;
  ctx.fillStyle = COLORS.accent;
  ctx.font = `bold 60px ${FONT}`;
  ctx.fillText(summary.title, PAD, y);
  y += 72;
  ctx.fillStyle = COLORS.text;
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(headline(summary, o), PAD, y);
  if (summary.groups.length > 1) {
    y += 56;
    ctx.fillStyle = COLORS.sub;
    ctx.font = `32px ${FONT}`;
    ctx.fillText(fit(ctx, breakdown(summary), W - PAD * 2), PAD, y);
  }
  y = HEADER_H;

  for (const g of summary.groups) {
    // Group heading on a soft band
    ctx.fillStyle = COLORS.accentSoft;
    ctx.fillRect(PAD - 24, y + 24, W - (PAD - 24) * 2, 72);
    ctx.fillStyle = COLORS.accent;
    ctx.font = `bold 36px ${FONT}`;
    ctx.fillText(g.label, PAD, y + 72);
    ctx.textAlign = 'right';
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(groupHeading(g, o), W - PAD, y + 72);
    ctx.textAlign = 'left';
    y += GROUP_HEAD_H;

    for (const r of g.rows) {
      let priceWidth = 0;
      if (o.showPrice) {
        ctx.font = `500 30px ${FONT}`;
        priceWidth = ctx.measureText(r.price).width + 32;
        ctx.fillStyle = COLORS.sub;
        ctx.fillText(r.price, W - PAD - priceWidth + 32, y + 40);
      }

      ctx.fillStyle = COLORS.faint;
      ctx.font = `30px ${FONT}`;
      ctx.fillText(r.date, PAD, y + 40);
      const titleX = PAD + 110;
      ctx.fillStyle = COLORS.text;
      ctx.font = `500 32px ${FONT}`;
      ctx.fillText(fit(ctx, r.title, W - PAD - titleX - priceWidth), titleX, y + 40);

      if (r.place) {
        ctx.fillStyle = COLORS.faint;
        ctx.font = `26px ${FONT}`;
        ctx.fillText(fit(ctx, r.place, W - PAD - titleX), titleX, y + 80);
      }
      ctx.fillStyle = COLORS.rule;
      ctx.fillRect(PAD, y + ROW_H - 2, W - PAD * 2, 2);
      y += ROW_H;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image export failed'))), 'image/jpeg', 0.92);
  });
}
