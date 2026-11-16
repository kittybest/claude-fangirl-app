import { useMemo, useState } from 'react';
import { Artist } from '../../types';
import { buildArtistIndex, findArtist, searchArtists } from '../../utils/artists';

export default function ArtistSelect({ artists, exclude, placeholder, onPick, createLabel, onCreate }: {
  artists: Artist[];
  exclude: string[];
  placeholder: string;
  onPick: (artist: Artist) => void;
  createLabel?: string;
  onCreate?: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const index = useMemo(() => buildArtistIndex(artists), [artists]);
  const matches = query.trim()
    ? searchArtists(artists, query, 6).filter(a => !exclude.includes(a.id))
    : [];
  const canCreate = !!onCreate && !!query.trim() && !findArtist(index, query);

  return (
    <div className="relative">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-lg px-2 py-1.5 text-xs" />
      {(matches.length > 0 || canCreate) && (
        <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
          {matches.map(a => (
            <li key={a.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setQuery(''); onPick(a); }}
              className="px-3 py-2 text-xs hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-0 flex gap-1.5">
              <span className="text-gray-700 truncate">{a.name}</span>
              {a.aliases.length > 0 && (
                <span className="text-[10px] text-gray-400 truncate">{a.aliases.join(' / ')}</span>
              )}
            </li>
          ))}
          {canCreate && (
            <li onMouseDown={e => e.preventDefault()}
              onClick={() => { const name = query.trim(); setQuery(''); onCreate!(name); }}
              className="px-3 py-2 text-xs text-blue-500 hover:bg-blue-50 cursor-pointer border-t border-gray-100">
              {createLabel}「{query.trim()}」
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
