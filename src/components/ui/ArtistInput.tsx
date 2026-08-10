import { useMemo, useState } from 'react';
import { Artist } from '../../types';
import { buildArtistIndex, findArtist, normalizeName, searchArtists } from '../../utils/artists';

interface Props {
  value: string[];
  artists: Artist[];
  onChange: (names: string[]) => void;
  placeholder?: string;
}

export default function ArtistInput({ value, artists, onChange, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const index = useMemo(() => buildArtistIndex(artists), [artists]);

  const selectedIds = new Set(
    value.map(name => findArtist(index, name)?.id).filter((id): id is string => !!id)
  );
  const suggestions = query.trim()
    ? searchArtists(artists, query).filter(a => !selectedIds.has(a.id))
    : [];
  const exact = findArtist(index, query);
  const canCreate = !!query.trim() && !exact;

  // Store the artist's display name, not what was typed, so picking 온유 from
  // the list shows up as Onew everywhere.
  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const label = findArtist(index, trimmed)?.name ?? trimmed;
    setQuery('');
    if (value.some(v => normalizeName(v) === normalizeName(label))) return;
    onChange([...value, label]);
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const commit = () => {
    if (!query.trim()) return;
    if (exact) add(exact.name);
    else if (suggestions.length === 1) add(suggestions[0].name);
    else add(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      remove(value.length - 1);
    }
  };

  return (
    <div className="relative">
      <div className="w-full border rounded-lg px-2 py-1.5 flex flex-wrap gap-1 items-center">
        {value.map((name, i) => {
          const artist = findArtist(index, name);
          return (
            <span key={`${name}-${i}`}
              className={`text-xs pl-2 pr-1 py-0.5 rounded-full flex items-center gap-1 ${
                artist ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
              }`}>
              {artist?.name ?? name}
              {!artist && <span className="text-[9px] opacity-70">新</span>}
              <button type="button" onClick={() => remove(i)} className="opacity-50 px-0.5">✕</button>
            </span>
          );
        })}
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setOpen(false); commit(); }} // don't silently drop half-typed text
          onKeyDown={handleKeyDown}
          placeholder={value.length > 0 ? '' : placeholder}
          className="flex-1 min-w-[6rem] px-1 py-0.5 text-sm outline-none bg-transparent"
        />
      </div>
      {open && (suggestions.length > 0 || canCreate) && (
        <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-44 overflow-y-auto">
          {suggestions.map(a => (
            <li key={a.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => add(a.name)}
              className="px-3 py-2 text-xs hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-1.5">
              <span className="text-gray-700 truncate">{a.name}</span>
              {a.aliases.length > 0 && (
                <span className="text-[10px] text-gray-400 truncate">{a.aliases.join(' / ')}</span>
              )}
              {!a.reviewed && <span className="text-[9px] text-amber-500 ml-auto flex-shrink-0">待整理</span>}
            </li>
          ))}
          {canCreate && (
            <li onMouseDown={e => e.preventDefault()}
              onClick={() => add(query)}
              className="px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 cursor-pointer border-t border-gray-100">
              新增「{query.trim()}」
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
