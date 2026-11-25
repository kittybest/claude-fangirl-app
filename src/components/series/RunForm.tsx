import { useMemo, useState } from 'react';
import { Run, Venue } from '../../types';
import { TIMEZONES } from '../../utils/constants';
import { buildVenueIndex, displayVenue } from '../../utils/venues';
import VenueInput from '../ui/VenueInput';

interface Props {
  initial?: Run;
  allVenues?: Venue[];
  onSave: (run: Omit<Run, 'id' | 'venueId'>) => void;
  onClose: () => void;
}

export default function RunForm({ initial, allVenues = [], onSave, onClose }: Props) {
  const venueIndex = useMemo(() => buildVenueIndex(allVenues), [allVenues]);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [venue, setVenue] = useState(initial ? displayVenue(venueIndex, initial)?.name ?? '' : '');
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'Asia/Taipei');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [dateNote, setDateNote] = useState(initial?.dateNote ?? '');
  const [infoUrl, setInfoUrl] = useState(initial?.infoUrl ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const rangeInvalid = !!startDate && !!endDate && endDate < startDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || rangeInvalid) return;
    onSave({
      title: title.trim(),
      venue: venue.trim() || undefined,
      timezone,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dateNote: dateNote.trim() || undefined,
      infoUrl: infoUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
          <h2 className="text-base font-bold">{initial ? '編輯檔期' : '新增檔期'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-3">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="劇名 * (e.g. Wuthering Heights)"
              required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <VenueInput value={venue} venues={allVenues} onChange={setVenue} placeholder="場館" />
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-sm bg-white">
              {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
            <div className="flex gap-2 items-center">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm" />
              <span className="text-xs text-gray-400">~</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-sm" />
            </div>
            {rangeInvalid && <p className="text-[10px] text-red-500">結束日早於開始日</p>}
            <input value={dateNote} onChange={e => setDateNote(e.target.value)}
              placeholder="日期備註 (選填，e.g. 2月，日期未公布)"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={infoUrl} onChange={e => setInfoUrl(e.target.value)}
              placeholder="官方資訊連結 (選填，製作公司官網或 IG)"
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="備註"
              className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
            <button type="submit" disabled={rangeInvalid}
              className="w-full bg-purple-500 text-white rounded-full py-2.5 text-sm font-medium disabled:bg-gray-300">
              {initial ? '儲存' : '新增'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
