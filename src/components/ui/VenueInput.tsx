import { useMemo, useState } from 'react';
import { Venue } from '../../types';
import { buildVenueIndex, findVenue, searchVenues } from '../../utils/venues';
import { normalizeName } from '../../utils/entities';

interface Props {
  value: string;
  venues: Venue[];
  onChange: (name: string) => void;
  /** Fires when an existing venue is picked, so the form can pull its link in. */
  onSelect?: (venue: Venue) => void;
  placeholder?: string;
  className?: string;
}

export default function VenueInput({ value, venues, onChange, onSelect, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const index = useMemo(() => buildVenueIndex(venues), [venues]);

  const matched = findVenue(index, value);
  const suggestions = value.trim()
    ? searchVenues(venues, value).filter(v => v.id !== matched?.id)
    : [];
  // Typed an alias — worth showing which place it landed on
  const viaAlias = matched && normalizeName(matched.name) !== normalizeName(value);

  const pick = (venue: Venue) => {
    onChange(venue.name);
    onSelect?.(venue);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className={className ?? 'w-full border rounded-lg px-3 py-2 text-sm'}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-44 overflow-y-auto">
          {suggestions.map(v => (
            <li key={v.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(v)}
              className="px-3 py-2 text-xs hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-1.5">
              <span className="text-gray-700 truncate">{v.name}</span>
              {v.aliases.length > 0 && (
                <span className="text-[10px] text-gray-400 truncate">{v.aliases.join(' / ')}</span>
              )}
              {v.city && <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{v.city}</span>}
              {!v.reviewed && <span className="text-[9px] text-amber-500 flex-shrink-0">待整理</span>}
            </li>
          ))}
        </ul>
      )}
      {viaAlias && (
        <p className="text-[10px] text-gray-400 mt-0.5">對應到「{matched.name}」</p>
      )}
      {!matched && value.trim() && (
        <p className="text-[10px] text-amber-600 mt-0.5">儲存後會新增為新場地</p>
      )}
    </div>
  );
}
