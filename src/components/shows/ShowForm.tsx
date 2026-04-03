import { useState } from 'react';
import { Show, ShowLink, ShowStatus, ShowCategory, Currency } from '../../types';
import { SHOW_CATEGORIES, STATUS_CONFIG, TIMEZONES } from '../../utils/constants';
import { CURRENCIES, convertToTWD } from '../../utils/currency';

interface Props {
  initial?: Show;
  onSave: (show: Omit<Show, 'id'>) => void;
  onClose: () => void;
}

export default function ShowForm({ initial, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(initial?.time ?? '');
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'Asia/Taipei');
  const [artists, setArtists] = useState(initial?.artists.join(', ') ?? '');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [venueUrl, setVenueUrl] = useState(initial?.venueUrl ?? '');
  const [seat, setSeat] = useState(initial?.seat ?? '');
  const [category, setCategory] = useState<ShowCategory | ''>(initial?.category ?? '');
  const [links, setLinks] = useState<ShowLink[]>(initial?.links ?? []);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [ticketPrice, setTicketPrice] = useState(initial?.ticketPrice?.toString() ?? '');
  const [ticketCurrency, setTicketCurrency] = useState<Currency>(initial?.ticketCurrency ?? 'TWD');
  const [status, setStatus] = useState<ShowStatus>(initial?.status ?? 'interested');
  const [resalePrice, setResalePrice] = useState(initial?.resalePrice?.toString() ?? '');
  const [resaleCurrency, setResaleCurrency] = useState<Currency>(initial?.resaleCurrency ?? 'TWD');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const addLink = () => {
    if (!newLinkUrl) return;
    setLinks([...links, { label: newLinkLabel || '連結', url: newLinkUrl }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    const price = ticketPrice ? parseFloat(ticketPrice) : undefined;
    const resale = resalePrice ? parseFloat(resalePrice) : undefined;
    onSave({
      title, date,
      time: time || undefined,
      timezone: time ? timezone : undefined,
      artists: artists ? artists.split(',').map(a => a.trim()).filter(Boolean) : [],
      venue: venue || undefined,
      venueUrl: venueUrl || undefined,
      seat: seat || undefined,
      category: category || undefined,
      links,
      ticketPrice: price,
      ticketCurrency: price ? ticketCurrency : undefined,
      ticketPriceTWD: price ? convertToTWD(price, ticketCurrency) : undefined,
      status,
      resalePrice: resale,
      resaleCurrency: resale ? resaleCurrency : undefined,
      resalePriceTWD: resale ? convertToTWD(resale, resaleCurrency) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">{initial ? '編輯演出' : '新增演出'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="演出名稱 *" required
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input type="time" value={time} onChange={e => setTime(e.target.value)} placeholder="時間"
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-2 text-sm bg-white">
              {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
          <input value={artists} onChange={e => setArtists(e.target.value)} placeholder="演出者 (逗號分隔)"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="地點"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={venueUrl} onChange={e => setVenueUrl(e.target.value)} placeholder="地點連結 (選填)"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={seat} onChange={e => setSeat(e.target.value)} placeholder="座位 (選填)"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={category} onChange={e => setCategory(e.target.value as ShowCategory | '')}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">類別 (選填)</option>
            {SHOW_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {/* Links */}
          <div>
            <p className="text-xs text-gray-500 mb-1">相關連結</p>
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-1 mb-1">
                <span className="text-xs text-blue-500 flex-1 truncate">{link.label}: {link.url}</span>
                <button type="button" onClick={() => removeLink(i)} className="text-[10px] text-red-400">x</button>
              </div>
            ))}
            <div className="flex gap-1">
              <input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} placeholder="名稱"
                className="w-20 border rounded-lg px-2 py-1.5 text-xs" />
              <input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL"
                className="flex-1 border rounded-lg px-2 py-1.5 text-xs" />
              <button type="button" onClick={addLink}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg">+</button>
            </div>
          </div>

          {/* Status */}
          <div className="flex gap-1.5">
            {(['interested', 'ticketed', 'cancelled'] as ShowStatus[]).map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
                  status === s ? STATUS_CONFIG[s].color + ' border-current' : 'border-gray-200 text-gray-400'
                }`}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Ticket price */}
          <div className="flex gap-2">
            <input type="number" step="0.01" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)}
              placeholder="票價" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <select value={ticketCurrency} onChange={e => setTicketCurrency(e.target.value as Currency)}
              className="w-20 border rounded-lg px-2 py-2 text-sm bg-white">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {ticketPrice && (
            <p className="text-[10px] text-gray-400">
              ≈ NT${convertToTWD(parseFloat(ticketPrice) || 0, ticketCurrency).toLocaleString()}
            </p>
          )}

          {/* Resale (only when cancelled) */}
          {status === 'cancelled' && (
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-gray-500 mb-1">轉售資訊</p>
              <div className="flex gap-2">
                <input type="number" step="0.01" value={resalePrice} onChange={e => setResalePrice(e.target.value)}
                  placeholder="賣出價格" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <select value={resaleCurrency} onChange={e => setResaleCurrency(e.target.value as Currency)}
                  className="w-20 border rounded-lg px-2 py-2 text-sm bg-white">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="備註"
            className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          <button type="submit" className="w-full bg-purple-500 text-white rounded-full py-2.5 text-sm font-medium">
            {initial ? '儲存' : '新增'}
          </button>
        </form>
      </div>
    </div>
  );
}
