import { Show, Schedule } from '../../types';
import { STATUS_CONFIG, SHOW_CATEGORIES, SCHEDULE_TYPES } from '../../utils/constants';
import { weekdayZh } from '../../utils/date';

interface Props {
  date: string;
  shows: Show[];
  schedules: Schedule[];
  allShows: Show[];
  onAddShow: () => void;
  onAddSchedule: () => void;
  onEditShow: (show: Show) => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDuplicateSchedule: (schedule: Schedule) => void;
  onDeleteShow: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
}

export default function DayDetail({ date, shows, schedules, allShows, onEditShow, onEditSchedule, onDuplicateSchedule, onDeleteShow, onDeleteSchedule }: Props) {
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

  const getRelatedShowTitle = (showId?: string) => {
    if (!showId) return null;
    return allShows.find(s => s.id === showId)?.title;
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
          {s.artists.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{s.artists.join(', ')}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">
            {s.time && <span>{s.time}</span>}
            {s.venue && (
              s.venueUrl
                ? <a href={s.venueUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{s.venue}</a>
                : <span>{s.venue}</span>
            )}
            {s.seat && <span>座位: {s.seat}</span>}
            {s.category && <span>{SHOW_CATEGORIES.find(c => c.value === s.category)?.label}</span>}
            {s.ticketPriceTWD != null && <span>NT${s.ticketPriceTWD.toLocaleString()}</span>}
          </div>
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
          <div className="flex gap-2 mt-2">
            <button onClick={() => onEditShow(s)} className="flex-1 text-xs text-purple-500 border border-purple-300 rounded-full py-1.5">編輯</button>
            <button onClick={() => onDeleteShow(s.id)} className="flex-1 text-xs text-red-400 border border-red-300 rounded-full py-1.5">刪除</button>
          </div>
        </div>
      ))}

      {/* Schedules */}
      {schedules.map(s => {
        const relatedTitle = getRelatedShowTitle(s.relatedShowId);
        return (
          <div key={s.id} className="bg-white rounded-lg p-3 mb-2 shadow-sm border-l-2 border-blue-400">
            <div className="flex items-center gap-2">
              <span className="text-xs">⏰</span>
              <span className="text-sm font-medium text-gray-800 flex-1">{s.title}</span>
              <span className="text-[10px] text-blue-500">{getScheduleTime(s)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
              <span>{SCHEDULE_TYPES.find(t => t.value === s.type)?.label}</span>
              {relatedTitle && <span>- {relatedTitle}</span>}
            </div>
            {s.ticketUrl && (
              <a href={s.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 underline mt-1 block">
                購票連結
              </a>
            )}
            {s.notes && <p className="text-[10px] text-gray-400 mt-1">{s.notes}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => onEditSchedule(s)} className="flex-1 text-xs text-purple-500 border border-purple-300 rounded-full py-1.5">編輯</button>
              <button onClick={() => onDuplicateSchedule(s)} className="flex-1 text-xs text-blue-500 border border-blue-300 rounded-full py-1.5">複製</button>
              <button onClick={() => onDeleteSchedule(s.id)} className="flex-1 text-xs text-red-400 border border-red-300 rounded-full py-1.5">刪除</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
