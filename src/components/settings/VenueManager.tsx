import { useMemo, useState } from 'react';
import { AppData, Venue } from '../../types';
import { buildVenueIndex, searchVenues, venueUsage } from '../../utils/venues';
import { findEntity, normalizeName } from '../../utils/entities';

interface Props {
  data: AppData;
  onUpdate: (id: string, updates: Partial<Omit<Venue, 'id'>>) => void;
  onMerge: (fromId: string, intoId: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function VenueManager({ data, onUpdate, onMerge, onRemove, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const usage = useMemo(() => venueUsage(data.shows), [data.shows]);
  const unreviewed = data.venues.filter(v => !v.reviewed).length;

  // Unreviewed first — the list doubles as a to-do list after the migration.
  const sorted = useMemo(() => {
    const list = query.trim() ? searchVenues(data.venues, query, 500) : [...data.venues];
    return list.sort((a, b) => {
      if (!a.reviewed !== !b.reviewed) return a.reviewed ? 1 : -1;
      const diff = (usage.get(b.id) || 0) - (usage.get(a.id) || 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [data.venues, query, usage]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-center">
      <div className="bg-gray-50 w-full max-w-lg flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-400 text-sm">‹ 返回</button>
            <h2 className="text-base font-bold flex-1">場地</h2>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            共 {data.venues.length} 個
            {unreviewed > 0 && <span className="text-amber-600"> · {unreviewed} 個待整理</span>}
          </p>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋名稱或別名"
            className="w-full border rounded-lg px-3 py-1.5 text-sm mt-2" />
        </div>

        <div className="flex-1 overflow-y-auto divide-y pb-16"> {/* clears the bottom nav */}
          {sorted.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-8">沒有符合的場地</p>
          ) : sorted.map(venue => (
            <div key={venue.id} className={`bg-white ${venue.reviewed ? '' : 'border-l-2 border-amber-300'}`}>
              <button onClick={() => setEditingId(editingId === venue.id ? null : venue.id)}
                className="w-full px-4 py-2.5 text-left flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    {venue.name}
                    {venue.city && <span className="text-[10px] text-gray-400 ml-1.5">{venue.city}</span>}
                    {venue.url && <span className="text-[10px] text-blue-400 ml-1">🔗</span>}
                  </p>
                  {venue.aliases.length > 0 && (
                    <p className="text-[10px] text-gray-400 truncate">{venue.aliases.join(' / ')}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{usage.get(venue.id) || 0} 場</span>
              </button>
              {editingId === venue.id && (
                <VenueEditor
                  key={venue.id}
                  venue={venue}
                  venues={data.venues}
                  usageCount={usage.get(venue.id) || 0}
                  onSave={updates => { onUpdate(venue.id, updates); setEditingId(null); }}
                  onMerge={intoId => { onMerge(venue.id, intoId); setEditingId(null); }}
                  onRemove={() => { onRemove(venue.id); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface EditorProps {
  venue: Venue;
  venues: Venue[];
  usageCount: number;
  onSave: (updates: Partial<Omit<Venue, 'id'>>) => void;
  onMerge: (intoId: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

function VenueEditor({ venue, venues, usageCount, onSave, onMerge, onRemove, onCancel }: EditorProps) {
  const [name, setName] = useState(venue.name);
  const [aliases, setAliases] = useState<string[]>(venue.aliases);
  const [city, setCity] = useState(venue.city ?? '');
  const [url, setUrl] = useState(venue.url ?? '');
  const [aliasDraft, setAliasDraft] = useState('');
  const [merging, setMerging] = useState(false);

  const others = venues.filter(v => v.id !== venue.id);
  const index = useMemo(() => buildVenueIndex(others), [others]);

  const addAlias = () => {
    const value = aliasDraft.trim();
    if (!value) return;
    const key = normalizeName(value);
    setAliasDraft('');
    if (key === normalizeName(name) || aliases.some(a => normalizeName(a) === key)) return;
    const owner = findEntity(index, value);
    if (owner) {
      alert(`「${value}」已經是「${owner.name}」的名稱或別名。要合併成同一個場地請用下方的「合併到…」。`);
      return;
    }
    setAliases([...aliases, value]);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const owner = findEntity(index, trimmed);
    if (owner) {
      alert(`「${trimmed}」已經是「${owner.name}」的名稱或別名，請改用「合併到…」。`);
      return;
    }
    onSave({
      name: trimmed,
      aliases,
      city: city.trim() || undefined,
      url: url.trim() || undefined,
      reviewed: true,
    });
  };

  const remove = () => {
    if (usageCount > 0) {
      alert(`還有 ${usageCount} 場演出在「${venue.name}」，請先合併到其他場地。`);
      return;
    }
    if (confirm(`刪除「${venue.name}」？`)) onRemove();
  };

  const merge = (target: Venue) => {
    const ok = confirm(
      `把「${venue.name}」併入「${target.name}」？\n\n` +
      `「${venue.name}」和它的別名會變成「${target.name}」的別名，` +
      `${usageCount} 場演出會改指向「${target.name}」，然後「${venue.name}」會被刪除。`
    );
    if (ok) onMerge(target.id);
  };

  return (
    <div className="px-4 pb-3 pt-1 bg-gray-50 border-t space-y-2.5">
      <div>
        <p className="text-[10px] text-gray-400 mb-1">正式名稱</p>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-1.5 text-sm" />
      </div>

      <div>
        <p className="text-[10px] text-gray-400 mb-1">別名 — 之後輸入這些字也會跳出這個場地</p>
        <div className="flex flex-wrap gap-1 mb-1">
          {aliases.map((alias, i) => (
            <span key={`${alias}-${i}`} className="text-xs bg-purple-100 text-purple-700 pl-2 pr-1 py-0.5 rounded-full flex items-center gap-1">
              {alias}
              <button type="button" onClick={() => setAliases(aliases.filter((_, idx) => idx !== i))}
                className="opacity-50 px-0.5">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input value={aliasDraft} onChange={e => setAliasDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
            placeholder="例如 小巨蛋、臺北小巨蛋" className="flex-1 border rounded-lg px-2 py-1.5 text-xs" />
          <button type="button" onClick={addAlias}
            className="text-xs bg-gray-100 text-gray-600 px-3 rounded-lg">+</button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1">城市</p>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="台北"
            className="w-full border rounded-lg px-2 py-1.5 text-xs" />
        </div>
        <div className="flex-[2]">
          <p className="text-[10px] text-gray-400 mb-1">連結</p>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://"
            className="w-full border rounded-lg px-2 py-1.5 text-xs" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={save}
          className="flex-1 bg-purple-500 text-white rounded-full py-1.5 text-xs font-medium">儲存</button>
        <button type="button" onClick={onCancel}
          className="px-4 border border-gray-300 text-gray-500 rounded-full py-1.5 text-xs">取消</button>
      </div>

      <div className="border-t pt-2 flex gap-2">
        <button type="button" onClick={() => setMerging(!merging)}
          className="flex-1 text-xs text-blue-500 border border-blue-300 rounded-full py-1.5">合併到…</button>
        <button type="button" onClick={remove}
          className="flex-1 text-xs text-red-400 border border-red-300 rounded-full py-1.5">刪除</button>
      </div>
      {merging && <VenueSelect venues={others} onPick={merge} />}
    </div>
  );
}

function VenueSelect({ venues, onPick }: { venues: Venue[]; onPick: (venue: Venue) => void }) {
  const [query, setQuery] = useState('');
  const matches = query.trim() ? searchVenues(venues, query, 6) : [];

  return (
    <div className="relative">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="要併入哪一個？"
        className="w-full border rounded-lg px-2 py-1.5 text-xs" />
      {matches.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
          {matches.map(v => (
            <li key={v.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setQuery(''); onPick(v); }}
              className="px-3 py-2 text-xs hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-0 flex gap-1.5">
              <span className="text-gray-700 truncate">{v.name}</span>
              {v.aliases.length > 0 && (
                <span className="text-[10px] text-gray-400 truncate">{v.aliases.join(' / ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
