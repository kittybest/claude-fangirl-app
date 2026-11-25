import { useMemo, useState } from 'react';
import { Show, Schedule, Series, Artist, Venue, LineupSlot } from '../../types';
import { STATUS_CONFIG, SHOW_CATEGORIES, SCHEDULE_TYPES } from '../../utils/constants';
import { weekdayZh } from '../../utils/date';
import { buildArtistIndex, displayNames } from '../../utils/artists';
import { buildVenueIndex, displayVenue } from '../../utils/venues';
import { downloadShowIcs } from '../../utils/calendar';
import StarRating from '../ui/StarRating';
import LineupModal from '../shows/LineupModal';

interface Props {
  date: string;
  shows: Show[];
  schedules: Schedule[];
  allShows: Show[];
  allSeries: Series[];
  allArtists: Artist[];
  allVenues: Venue[];
  isAuthorized: boolean;
  onGoToSeries: (seriesId: string) => void;
  onNavigateToDate: (date: string) => void;
  onAddShow: () => void;
  onAddSchedule: () => void;
  onEditShow: (show: Show) => void;
  onDuplicateShow: (show: Show) => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDuplicateSchedule: (schedule: Schedule) => void;
  onDeleteShow: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateLineup: (showId: string, lineup: LineupSlot[]) => void;
}

export default function DayDetail({ date, shows, schedules, allShows, allSeries, allArtists, allVenues, isAuthorized, onGoToSeries, onNavigateToDate, onEditShow, onDuplicateShow, onEditSchedule, onDuplicateSchedule, onDeleteShow, onDeleteSchedule, onUpdateLineup }: Props) {
  const [lineupShowId, setLineupShowId] = useState<string | null>(null);
  const lineupShow = lineupShowId ? shows.find(s => s.id === lineupShowId) : undefined;
  const artistIndex = useMemo(() => buildArtistIndex(allArtists), [allArtists]);
  const venueIndex = useMemo(() => buildVenueIndex(allVenues), [allVenues]);
  const d = new Date(date + 'T00:00:00');
  const label = `${d.getMonth() + 1}/${d.getDate()} (${weekdayZh(d)})`;

  const getScheduleTime = (s: Schedule) => {
    try {
      const utc = new Date(s.datetime);
      return utc.toLocaleTimeString('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch { return ''; }
  };

  const addToCalendar = (s: Show) => {
    const venue = displayVenue(venueIndex, s);
    downloadShowIcs({
      id: s.id,
      title: s.title,
      date: s.date,
      time: s.time,
      timezone: s.timezone,
      artists: displayNames(artistIndex, s),
      venue: venue?.name,
      venueUrl: venue?.url,
      seat: s.seat,
      notes: s.notes,
      links: s.links,
    });
  };

  const getRelatedShow = (showId?: string) => {
    if (!showId) return null;
    return allShows.find(s => s.id === showId) ?? null;
  };

  return (
    <div className="p-3">
      <h3 className="text-sm font-bold text-gray-700 mb-2">{label}</h3>

      {shows.length === 0 && schedules.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">這天沒有項目</p>
      )}

      {/* Shows */}
      {shows.map(s => (
        <div key={s.id} className="bg-white rounded-lg p-3 mb-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s.status].dot}`} />
            <span className="text-sm font-medium text-gray-800 flex-1">{s.title}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[s.status].color}`}>
              {STATUS_CONFIG[s.status].label}
            </span>
          </div>
          {displayNames(artistIndex, s).length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{displayNames(artistIndex, s).join(', ')}</p>
          )}
          {s.seriesId && (() => {
            const sr = allSeries.find(sr => sr.id === s.seriesId);
            return sr ? (
              <button onClick={() => onGoToSeries(sr.id)}
                className="text-[10px] text-purple-500 underline mt-0.5 block">
                {sr.title}
              </button>
            ) : null;
          })()}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">
            {s.time && <span>{s.time}</span>}
            {(() => {
              const venue = displayVenue(venueIndex, s);
              if (!venue) return null;
              return venue.url
                ? <a href={venue.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{venue.name}</a>
                : <span>{venue.name}</span>;
            })()}
            {s.seat && <span>座位: {s.seat}</span>}
            {s.category && <span>{SHOW_CATEGORIES.find(c => c.value === s.category)?.label}</span>}
            {s.ticketPriceTWD != null && <span>NT${s.ticketPriceTWD.toLocaleString()}</span>}
          </div>
          {s.rating ? <div className="mt-1"><StarRating value={s.rating} size="sm" /></div> : null}
          {s.category === 'festival' && (isAuthorized || (s.lineup?.length ?? 0) > 0) && (
            <button onClick={() => setLineupShowId(s.id)}
              className="mt-1.5 text-xs text-amber-600 border border-amber-300 rounded-full px-3 py-1">
              節目表{s.lineup?.length ? `（已選 ${s.lineup.filter(l => l.starred).length} / 共 ${s.lineup.length}）` : ''}
            </button>
          )}
          {s.notes && <p className="text-[10px] text-gray-400 mt-1">{s.notes}</p>}
          {s.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {s.links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 underline">
                  {link.label}
                </a>
              ))}
            </div>
          )}
          {isAuthorized && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => addToCalendar(s)} aria-label="加入 Apple 行事曆" title="加入 Apple 行事曆"
                className="text-xs border border-gray-200 rounded-full py-1.5 px-3">📅</button>
              <button onClick={() => onEditShow(s)} className="flex-1 text-xs text-purple-500 border border-purple-300 rounded-full py-1.5">編輯</button>
              <button onClick={() => onDuplicateShow(s)} className="flex-1 text-xs text-blue-500 border border-blue-300 rounded-full py-1.5">複製</button>
              <button onClick={() => onDeleteShow(s.id)} className="flex-1 text-xs text-red-400 border border-red-300 rounded-full py-1.5">刪除</button>
            </div>
          )}
        </div>
      ))}

      {/* Schedules */}
      {schedules.map(s => {
        const relatedShow = getRelatedShow(s.relatedShowId);
        return (
          <div key={s.id} className="bg-white rounded-lg p-3 mb-2 shadow-sm border-l-2 border-blue-400">
            <div className="flex items-center gap-2">
              <span className="text-xs">⏰</span>
              <span className="text-sm font-medium text-gray-800 flex-1">{s.title}</span>
              <span className="text-[10px] text-blue-500">{getScheduleTime(s)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
              <span>{SCHEDULE_TYPES.find(t => t.value === s.type)?.label}</span>
              {relatedShow && (
                <button
                  onClick={() => onNavigateToDate(relatedShow.date)}
                  className="text-purple-500 underline"
                >
                  {relatedShow.title} ({relatedShow.date})
                </button>
              )}
            </div>
            {s.ticketUrl && (
              <a href={s.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 underline mt-1 block">
                購票連結
              </a>
            )}
            {s.notes && <p className="text-[10px] text-gray-400 mt-1">{s.notes}</p>}
            {isAuthorized && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => onEditSchedule(s)} className="flex-1 text-xs text-purple-500 border border-purple-300 rounded-full py-1.5">編輯</button>
                <button onClick={() => onDuplicateSchedule(s)} className="flex-1 text-xs text-blue-500 border border-blue-300 rounded-full py-1.5">複製</button>
                <button onClick={() => onDeleteSchedule(s.id)} className="flex-1 text-xs text-red-400 border border-red-300 rounded-full py-1.5">刪除</button>
              </div>
            )}
          </div>
        );
      })}

      {lineupShow && (
        <LineupModal
          show={lineupShow}
          isAuthorized={isAuthorized}
          onChange={lineup => onUpdateLineup(lineupShow.id, lineup)}
          onClose={() => setLineupShowId(null)}
        />
      )}
    </div>
  );
}
