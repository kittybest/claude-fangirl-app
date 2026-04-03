import { useState } from 'react';
import { Schedule, ScheduleType, Show } from '../../types';
import { SCHEDULE_TYPES, TIMEZONES } from '../../utils/constants';

interface Props {
  initial?: Schedule;
  isEdit?: boolean;
  shows: Show[];
  onSave: (schedule: Omit<Schedule, 'id'>) => void;
  onClose: () => void;
}

export default function ScheduleForm({ initial, isEdit, shows, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(() => {
    if (!initial) return new Date().toISOString().slice(0, 10);
    // Convert stored UTC back to the target timezone for display
    const utc = new Date(initial.datetime);
    const inTz = new Date(utc.toLocaleString('en-US', { timeZone: initial.timezone }));
    return `${inTz.getFullYear()}-${String(inTz.getMonth() + 1).padStart(2, '0')}-${String(inTz.getDate()).padStart(2, '0')}`;
  });
  const [time, setTime] = useState(() => {
    if (!initial) return '12:00';
    const utc = new Date(initial.datetime);
    const inTz = new Date(utc.toLocaleString('en-US', { timeZone: initial.timezone }));
    return `${String(inTz.getHours()).padStart(2, '0')}:${String(inTz.getMinutes()).padStart(2, '0')}`;
  });
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'Asia/Taipei');
  const [type, setType] = useState<ScheduleType>(initial?.type ?? 'general');
  const [ticketUrl, setTicketUrl] = useState(initial?.ticketUrl ?? '');
  const [relatedShowId, setRelatedShowId] = useState(initial?.relatedShowId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;

    // Treat entered time as if it were UTC, then subtract target timezone offset
    // e.g. user enters 11:00 in Asia/Taipei (+8) → 11:00 UTC - 8h = 03:00 UTC
    const asUTC = new Date(`${date}T${time}:00Z`);
    const targetOffset = getTimezoneOffset(timezone, asUTC);
    const utc = new Date(asUTC.getTime() - targetOffset);

    onSave({
      title,
      datetime: utc.toISOString(),
      timezone,
      type,
      ticketUrl: ticketUrl || undefined,
      relatedShowId: relatedShowId || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">{isEdit ? '編輯時程' : initial ? '複製時程' : '新增搶票/抽票時程'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="標題 * (e.g. ATEEZ 會員搶票)" required
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} required
              className="w-28 border rounded-lg px-3 py-2 text-sm" />
          </div>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {SCHEDULE_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  type === t.value ? 'bg-blue-100 text-blue-700 border-blue-300' : 'border-gray-200 text-gray-400'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <input value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="購票連結"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={relatedShowId} onChange={e => setRelatedShowId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">關聯演出 (選填)</option>
            {shows.map(s => <option key={s.id} value={s.id}>{s.title} ({s.date})</option>)}
          </select>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="備註"
            className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          <button type="submit" className="w-full bg-blue-500 text-white rounded-full py-2.5 text-sm font-medium">
            {isEdit ? '儲存' : '新增'}
          </button>
        </form>
      </div>
    </div>
  );
}

function getTimezoneOffset(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}
