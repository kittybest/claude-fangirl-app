import { useMemo, useState } from 'react';
import { Run, Show, Venue } from '../../types';
import { buildVenueIndex, displayVenue, VenueIndex } from '../../utils/venues';
import { TIMEZONES } from '../../utils/constants';
import { ShowRow } from './ShowList';

interface Props {
  runs: Run[];
  shows: Show[];
  allVenues: Venue[];
  isAuthorized: boolean;
  onAddRun: () => void;
  onEditRun: (run: Run) => void;
  onDeleteRun: (id: string) => void;
  onAddShow: (run: Run) => void;
}

const DAY = 86400000;
/** Whole days since epoch, timezone-free, for comparing YYYY-MM-DD strings. */
const toDay = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};

function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function shortDate(date: string, currentYear: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return y === currentYear ? `${m}/${d}` : `${y}/${m}/${d}`;
}

interface DatedRun {
  run: Run;
  /** Missing start = already running; missing end = open-ended. */
  start: number;
  end: number;
}

export default function RunList({ runs, shows, allVenues, isAuthorized, onAddRun, onEditRun, onDeleteRun, onAddShow }: Props) {
  const venueIndex = useMemo(() => buildVenueIndex(allVenues), [allVenues]);
  const today = todayStr();
  const todayDay = toDay(today);
  const currentYear = Number(today.slice(0, 4));

  const [tripFrom, setTripFrom] = useState('');
  const [tripTo, setTripTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEnded, setShowEnded] = useState(false);

  // One date alone means a single-day trip
  const trip = tripFrom || tripTo
    ? (() => {
        const a = toDay(tripFrom || tripTo);
        const b = toDay(tripTo || tripFrom);
        return { from: Math.min(a, b), to: Math.max(a, b) };
      })()
    : null;

  const { active, ended, undated } = useMemo(() => {
    const dated: DatedRun[] = [];
    const undated: Run[] = [];
    for (const run of runs) {
      if (!run.startDate && !run.endDate) { undated.push(run); continue; }
      dated.push({
        run,
        start: run.startDate ? toDay(run.startDate) : -Infinity,
        end: run.endDate ? toDay(run.endDate) : Infinity,
      });
    }
    // Ending soonest first: those are the ones that can't wait for a later trip
    dated.sort((a, b) => a.end - b.end || a.start - b.start || a.run.title.localeCompare(b.run.title));
    return {
      active: dated.filter(r => r.end >= todayDay),
      ended: dated.filter(r => r.end < todayDay).reverse(),
      undated: [...undated].sort((a, b) => a.title.localeCompare(b.title)),
    };
  }, [runs, todayDay]);

  // Timeline axis: from the start of this month to the last finite end among active runs
  const axis = useMemo(() => {
    const t = new Date();
    const from = Date.UTC(t.getFullYear(), t.getMonth(), 1) / DAY;
    const ends = active.map(r => r.end).filter(Number.isFinite);
    if (trip) ends.push(trip.to);
    const lastEnd = Math.max(from + 60, ...ends);
    // Round up to the end of that month so the last tick has room
    const last = new Date(lastEnd * DAY);
    const to = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1) / DAY;
    const months: { label: string; pos: number }[] = [];
    for (let d = new Date(from * DAY); d.getTime() / DAY < to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
      months.push({ label: `${d.getUTCMonth() + 1}月`, pos: (d.getTime() / DAY - from) / (to - from) });
    }
    return { from, to, months };
  }, [active, trip]);

  const overlapDays = (r: DatedRun) => {
    if (!trip) return null;
    const lo = Math.max(r.start, trip.from);
    const hi = Math.min(r.end, trip.to);
    return hi >= lo ? hi - lo + 1 : 0;
  };

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  const rowProps = { shows, venueIndex, currentYear, isAuthorized, onEditRun, onDeleteRun, onAddShow };

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 flex-1">預計出發區間</p>
          {isAuthorized && (
            <button onClick={onAddRun}
              className="text-xs text-purple-500 border border-purple-300 rounded-full px-2.5 py-1">+ 新增檔期</button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={tripFrom} onChange={e => setTripFrom(e.target.value)}
            className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-xs" />
          <span className="text-xs text-gray-400">~</span>
          <input type="date" value={tripTo} onChange={e => setTripTo(e.target.value)}
            className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-xs" />
          {(tripFrom || tripTo) && (
            <button onClick={() => { setTripFrom(''); setTripTo(''); }} className="text-xs text-gray-400 px-1">清除</button>
          )}
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="text-gray-400 text-xs text-center py-8">沒有檔期</p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="bg-white">
              {/* Month ticks */}
              <div className="relative h-5 mx-4 mt-2">
                {axis.months.map(m => (
                  <span key={m.label + m.pos} className="absolute text-[10px] text-gray-400"
                    style={{ left: `${m.pos * 100}%` }}>{m.label}</span>
                ))}
              </div>
              <div className="divide-y">
                {active.map(r => {
                  const days = overlapDays(r);
                  return (
                    <RunRow key={r.run.id} run={r.run} {...rowProps}
                      isOpen={expandedId === r.run.id} onToggle={() => toggle(r.run.id)}
                      dimmed={days === 0}
                      badge={days ? `區間內 ${days} 天` : undefined}
                      bar={<TimelineBar r={r} axis={axis} trip={trip} todayDay={todayDay} dimmed={days === 0} />} />
                  );
                })}
              </div>
            </div>
          )}

          {undated.length > 0 && (
            <div className="mt-3">
              <p className="px-4 py-1.5 text-[10px] text-gray-400">日期未定</p>
              <div className="bg-white divide-y">
                {undated.map(run => (
                  <RunRow key={run.id} run={run} {...rowProps}
                    isOpen={expandedId === run.id} onToggle={() => toggle(run.id)} />
                ))}
              </div>
            </div>
          )}

          {ended.length > 0 && (
            <div className="mt-3 mb-4">
              <button onClick={() => setShowEnded(!showEnded)}
                className="px-4 py-1.5 text-[10px] text-gray-400 flex items-center gap-1">
                <span>{showEnded ? '▼' : '▶'}</span>已下檔 ({ended.length})
              </button>
              {showEnded && (
                <div className="bg-white divide-y">
                  {ended.map(r => (
                    <RunRow key={r.run.id} run={r.run} {...rowProps} dimmed
                      isOpen={expandedId === r.run.id} onToggle={() => toggle(r.run.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TimelineBar({ r, axis, trip, todayDay, dimmed }: {
  r: DatedRun;
  axis: { from: number; to: number };
  trip: { from: number; to: number } | null;
  todayDay: number;
  dimmed: boolean;
}) {
  const span = axis.to - axis.from;
  const pct = (day: number) => Math.min(100, Math.max(0, ((day - axis.from) / span) * 100));
  const left = pct(r.start);
  const right = pct(r.end + 1);
  return (
    <div className="relative h-2 mt-1.5 rounded-full bg-gray-100 overflow-hidden">
      {trip && (
        <div className="absolute inset-y-0 bg-amber-200/70"
          style={{ left: `${pct(trip.from)}%`, width: `${pct(trip.to + 1) - pct(trip.from)}%` }} />
      )}
      <div className={`absolute inset-y-0 rounded-full ${dimmed ? 'bg-gray-300' : 'bg-purple-400/80'}`}
        style={{ left: `${left}%`, width: `${Math.max(right - left, 1)}%` }} />
      <div className="absolute inset-y-0 w-px bg-red-400" style={{ left: `${pct(todayDay)}%` }} />
    </div>
  );
}

function RunRow({ run, shows, venueIndex, currentYear, isAuthorized, isOpen, onToggle, dimmed, badge, bar, onEditRun, onDeleteRun, onAddShow }: {
  run: Run;
  shows: Show[];
  venueIndex: VenueIndex;
  currentYear: number;
  isAuthorized: boolean;
  isOpen: boolean;
  onToggle: () => void;
  dimmed?: boolean;
  badge?: string;
  bar?: React.ReactNode;
  onEditRun: (run: Run) => void;
  onDeleteRun: (id: string) => void;
  onAddShow: (run: Run) => void;
}) {
  const venue = displayVenue(venueIndex, run);
  const picked = shows.filter(s => s.runId === run.id).sort((a, b) => a.date.localeCompare(b.date));
  const range = run.startDate || run.endDate
    ? `${run.startDate ? shortDate(run.startDate, currentYear) : ''} ~ ${run.endDate ? shortDate(run.endDate, currentYear) : ''}`
    : run.dateNote ?? '';
  const tzLabel = TIMEZONES.find(tz => tz.value === run.timezone)?.label;

  return (
    <div className={dimmed && !isOpen ? 'opacity-50' : ''}>
      <button onClick={onToggle} className="w-full px-4 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 flex-1 truncate">{run.title}</span>
          {picked.length > 0 && <span className="text-[10px] text-gray-400 flex-shrink-0">{picked.length}場</span>}
          {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">{badge}</span>}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
          <span className="flex-shrink-0">{range}</span>
          {venue && <span className="truncate text-gray-400">{venue.name}</span>}
        </div>
        {bar}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 space-y-2">
          {run.dateNote && (run.startDate || run.endDate) && (
            <p className="text-xs text-gray-500">{run.dateNote}</p>
          )}
          {tzLabel && <p className="text-[11px] text-gray-400">時區：{tzLabel}</p>}
          {run.infoUrl && (
            <a href={run.infoUrl} target="_blank" rel="noopener noreferrer"
              className="block text-xs text-blue-500 truncate">官方資訊：{run.infoUrl}</a>
          )}
          {run.notes && <p className="text-xs text-gray-600 whitespace-pre-wrap">{run.notes}</p>}
          {picked.length > 0 && (
            <div>
              {picked.map(s => (
                <ShowRow key={s.id} show={s} venueIndex={venueIndex} dateLabel={shortDate(s.date, currentYear)} />
              ))}
            </div>
          )}
          {isAuthorized && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => onAddShow(run)}
                className="text-xs text-white bg-purple-500 rounded-full px-3 py-1">新增場次</button>
              <button onClick={() => onEditRun(run)}
                className="text-xs text-purple-500 border border-purple-300 rounded-full px-3 py-1">編輯</button>
              <button onClick={() => { if (confirm(`刪除「${run.title}」檔期？已加入的場次會保留。`)) onDeleteRun(run.id); }}
                className="text-xs text-red-400 border border-red-300 rounded-full px-3 py-1">刪除</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
