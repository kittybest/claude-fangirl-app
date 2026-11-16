import { useMemo, useState } from 'react';
import { Show, ShowStatus, ShowCategory, Artist, Venue } from '../../types';
import { SHOW_CATEGORIES, STATUS_CONFIG } from '../../utils/constants';
import { buildArtistIndex, matchesArtist } from '../../utils/artists';
import { buildVenueIndex, displayVenue, VenueIndex } from '../../utils/venues';
import { weekdayZh } from '../../utils/date';
import ArtistSelect from '../ui/ArtistSelect';

type TimeScope = 'future' | 'past' | 'all';

export interface ShowFilters {
  time: TimeScope;
  year: number | null;
  month: number | null;
  statuses: ShowStatus[];
  categories: ShowCategory[];
  artistId: string | null;
}

const DEFAULT_STATUSES: ShowStatus[] = ['ticketed', 'interested'];
const STATUS_ORDER: ShowStatus[] = ['ticketed', 'interested', 'cancelled'];

interface Props {
  shows: Show[];
  allArtists: Artist[];
  allVenues: Venue[];
  initialFilters?: Partial<ShowFilters>;
}

export default function ShowList({ shows, allArtists, allVenues, initialFilters: init }: Props) {
  const artistIndex = useMemo(() => buildArtistIndex(allArtists), [allArtists]);
  const venueIndex = useMemo(() => buildVenueIndex(allVenues), [allVenues]);

  const [time, setTime] = useState<TimeScope>(init?.time ?? 'future');
  const [year, setYear] = useState<number | null>(init?.year ?? null);
  const [month, setMonth] = useState<number | null>(init?.month ?? null);
  const [statuses, setStatuses] = useState<ShowStatus[]>(init?.statuses ?? DEFAULT_STATUSES);
  const [categories, setCategories] = useState<ShowCategory[]>(init?.categories ?? []);
  const [artistId, setArtistId] = useState<string | null>(init?.artistId ?? null);
  const [panelOpen, setPanelOpen] = useState(false);

  const years = useMemo(() => {
    const set = new Set(shows.map(s => parseInt(s.date.slice(0, 4))).filter(y => !isNaN(y)));
    return [...set].sort((a, b) => b - a);
  }, [shows]);

  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local timezone

  const filtered = useMemo(() => {
    const list = shows.filter(s => {
      if (time === 'future' && s.date < today) return false;
      if (time === 'past' && s.date >= today) return false;
      if (year !== null && parseInt(s.date.slice(0, 4)) !== year) return false;
      if (year !== null && month !== null && parseInt(s.date.slice(5, 7)) !== month) return false;
      if (!statuses.includes(s.status)) return false;
      if (categories.length > 0 && !categories.includes(s.category || 'other')) return false;
      if (artistId && !matchesArtist(allArtists, artistIndex, s, artistId)) return false;
      return true;
    });
    const dir = time === 'future' ? 1 : -1;
    return list.sort((a, b) =>
      dir * (a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')));
  }, [shows, time, today, year, month, statuses, categories, artistId, allArtists, artistIndex]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; shows: Show[] }[] = [];
    for (const s of filtered) {
      const key = s.date.slice(0, 7);
      let group = out[out.length - 1];
      if (!group || group.key !== key) {
        group = { key, label: `${key.slice(0, 4)}年${parseInt(key.slice(5, 7))}月`, shows: [] };
        out.push(group);
      }
      group.shows.push(s);
    }
    return out;
  }, [filtered]);

  const toggleIn = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const statusIsDefault = statuses.length === DEFAULT_STATUSES.length
    && DEFAULT_STATUSES.every(s => statuses.includes(s));
  const selectedArtist = artistId ? artistIndex.byId.get(artistId) : undefined;

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (year !== null) {
    chips.push({
      key: 'year',
      label: month !== null ? `${year}年${month}月` : `${year}年`,
      clear: () => { setYear(null); setMonth(null); },
    });
  }
  if (!statusIsDefault) {
    chips.push({
      key: 'status',
      label: statuses.length === 0 ? '無狀態' : STATUS_ORDER.filter(s => statuses.includes(s)).map(s => STATUS_CONFIG[s].label).join('+'),
      clear: () => setStatuses(DEFAULT_STATUSES),
    });
  }
  for (const c of categories) {
    chips.push({
      key: `cat-${c}`,
      label: SHOW_CATEGORIES.find(x => x.value === c)?.label || c,
      clear: () => setCategories(categories.filter(x => x !== c)),
    });
  }
  if (artistId) {
    chips.push({ key: 'artist', label: selectedArtist?.name ?? artistId, clear: () => setArtistId(null) });
  }

  const reset = () => {
    setYear(null);
    setMonth(null);
    setStatuses(DEFAULT_STATUSES);
    setCategories([]);
    setArtistId(null);
  };

  const pill = (active: boolean) =>
    `text-xs px-2.5 py-1 rounded-full border transition-colors ${
      active ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
    }`;

  return (
    <div>
      <div className="bg-white border-b px-4 py-2 space-y-2 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {([['future', '未來'], ['past', '過去'], ['all', '全部']] as [TimeScope, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTime(key)}
                className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
                  time === key ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setPanelOpen(!panelOpen)}
            className={`text-xs px-3 py-1.5 rounded-full border flex-shrink-0 ${
              chips.length > 0 ? 'border-purple-300 text-purple-600' : 'border-gray-200 text-gray-500'
            }`}>
            篩選{chips.length > 0 && ` (${chips.length})`} {panelOpen ? '▲' : '▼'}
          </button>
        </div>

        {panelOpen && (
          <div className="space-y-2.5 pt-1 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-8 flex-shrink-0">年月</span>
              <select value={year ?? ''}
                onChange={e => { const v = e.target.value ? Number(e.target.value) : null; setYear(v); if (v === null) setMonth(null); }}
                className="border rounded-lg px-2 py-1 text-xs bg-white">
                <option value="">全部</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={month ?? ''} disabled={year === null}
                onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}
                className="border rounded-lg px-2 py-1 text-xs bg-white disabled:opacity-40">
                <option value="">全年</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-8 flex-shrink-0 pt-1">狀態</span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map(s => (
                  <button key={s} onClick={() => setStatuses(toggleIn(statuses, s))} className={pill(statuses.includes(s))}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-8 flex-shrink-0 pt-1">類型</span>
              <div className="flex flex-wrap gap-1.5">
                {SHOW_CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategories(toggleIn(categories, c.value))}
                    className={pill(categories.includes(c.value))}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-8 flex-shrink-0 pt-1.5">藝人</span>
              <div className="flex-1">
                {selectedArtist ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 pl-2.5 pr-1 py-1 rounded-full">
                    {selectedArtist.name}
                    <button onClick={() => setArtistId(null)} className="opacity-50 px-0.5">✕</button>
                  </span>
                ) : (
                  <ArtistSelect artists={allArtists} exclude={[]} placeholder="搜尋藝人"
                    onPick={a => setArtistId(a.id)} />
                )}
              </div>
            </div>

            {chips.length > 0 && (
              <div className="flex justify-end">
                <button onClick={reset} className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1">
                  重設
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <div className="flex flex-wrap gap-1 flex-1">
            {chips.map(c => (
              <span key={c.key} className="inline-flex items-center gap-0.5 text-[11px] bg-purple-50 text-purple-600 pl-2 pr-1 py-0.5 rounded-full">
                {c.label}
                <button onClick={c.clear} className="opacity-50 px-0.5">✕</button>
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">共 {filtered.length} 場</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-gray-400 text-xs text-center py-8">沒有符合條件的演出</p>
      ) : (
        groups.map(g => (
          <div key={g.key}>
            <div className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500">
              {g.label} · {g.shows.length}場
            </div>
            <div className="bg-white px-4 py-1">
              {g.shows.map(s => (
                <ShowRow key={s.id} show={s} venueIndex={venueIndex} dateLabel={shortDate(s.date)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}/${d} (${weekdayZh(new Date(y, m - 1, d))})`;
}

export function ShowRow({ show, venueIndex, dateLabel }: { show: Show; venueIndex: VenueIndex; dateLabel?: string }) {
  const venue = displayVenue(venueIndex, show);
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[show.status].dot}`} />
      <span className="text-xs text-gray-600 w-20 flex-shrink-0">{dateLabel ?? show.date}</span>
      <span className="text-xs text-gray-800 flex-1 truncate">{show.title}</span>
      {venue && <span className="text-[10px] text-gray-400 flex-shrink-0">{venue.name}</span>}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[show.status].color}`}>
        {STATUS_CONFIG[show.status].label}
      </span>
    </div>
  );
}
