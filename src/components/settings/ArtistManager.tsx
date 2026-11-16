import { useMemo, useState } from 'react';
import { AppData, Artist } from '../../types';
import { artistUsage, buildArtistIndex, findArtist, membersOf, newArtist, normalizeName, searchArtists } from '../../utils/artists';
import ArtistSelect from '../ui/ArtistSelect';

interface Props {
  data: AppData;
  onCreate: (artist: Artist) => void;
  onUpdate: (id: string, updates: Partial<Omit<Artist, 'id'>>) => void;
  onMerge: (fromId: string, intoId: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function ArtistManager({ data, onCreate, onUpdate, onMerge, onRemove, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    artistUsage(data).forEach((entry, id) => map.set(id, entry.shows + entry.expenses));
    return map;
  }, [data]);
  const count = (id: string) => totals.get(id) || 0;

  const unreviewed = data.artists.filter(a => !a.reviewed).length;

  // Unreviewed first — the list doubles as a to-do list after the migration.
  const sorted = useMemo(() => {
    const list = query.trim() ? searchArtists(data.artists, query, 500) : [...data.artists];
    return list.sort((a, b) => {
      if (!a.reviewed !== !b.reviewed) return a.reviewed ? 1 : -1;
      const diff = (totals.get(b.id) || 0) - (totals.get(a.id) || 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [data.artists, query, totals]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-center">
      <div className="bg-gray-50 w-full max-w-lg flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-400 text-sm">‹ 返回</button>
            <h2 className="text-base font-bold flex-1">藝人</h2>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            共 {data.artists.length} 位
            {unreviewed > 0 && <span className="text-amber-600"> · {unreviewed} 位待整理</span>}
          </p>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋名稱或別名"
            className="w-full border rounded-lg px-3 py-1.5 text-sm mt-2" />
        </div>

        <div className="flex-1 overflow-y-auto divide-y pb-16"> {/* clears the bottom nav */}
          {sorted.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-8">沒有符合的藝人</p>
          ) : sorted.map(artist => {
            const members = membersOf(data.artists, artist.id);
            const groups = (artist.groupIds || [])
              .map(id => data.artists.find(a => a.id === id))
              .filter((a): a is Artist => !!a);
            return (
              <div key={artist.id} className={`bg-white ${artist.reviewed ? '' : 'border-l-2 border-amber-300'}`}>
                <button onClick={() => setEditingId(editingId === artist.id ? null : artist.id)}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {artist.name}
                      {groups.length > 0 && (
                        <span className="text-[10px] text-purple-500 ml-1.5">＠{groups.map(g => g.name).join(' / ')}</span>
                      )}
                    </p>
                    {artist.aliases.length > 0 && (
                      <p className="text-[10px] text-gray-400 truncate">{artist.aliases.join(' / ')}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {count(artist.id)} 筆
                    {members.length > 0 && ` · ${members.length} 成員`}
                  </span>
                </button>
                {editingId === artist.id && (
                  <ArtistEditor
                    key={artist.id}
                    artist={artist}
                    artists={data.artists}
                    usageCount={count(artist.id)}
                    onCreate={onCreate}
                    onSave={updates => { onUpdate(artist.id, updates); setEditingId(null); }}
                    onMerge={intoId => { onMerge(artist.id, intoId); setEditingId(null); }}
                    onRemove={() => { onRemove(artist.id); setEditingId(null); }}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface EditorProps {
  artist: Artist;
  artists: Artist[];
  usageCount: number;
  onCreate: (artist: Artist) => void;
  onSave: (updates: Partial<Omit<Artist, 'id'>>) => void;
  onMerge: (intoId: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

function ArtistEditor({ artist, artists, usageCount, onCreate, onSave, onMerge, onRemove, onCancel }: EditorProps) {
  const [name, setName] = useState(artist.name);
  const [aliases, setAliases] = useState<string[]>(artist.aliases);
  const [groupIds, setGroupIds] = useState<string[]>(artist.groupIds || []);
  const [aliasDraft, setAliasDraft] = useState('');
  const [merging, setMerging] = useState(false);

  const others = artists.filter(a => a.id !== artist.id);
  const index = useMemo(() => buildArtistIndex(others), [others]);
  // A group can't also be a member of this artist — roll-up is one level only.
  const memberIds = membersOf(artists, artist.id).map(a => a.id);

  const addAlias = () => {
    const value = aliasDraft.trim();
    if (!value) return;
    const key = normalizeName(value);
    setAliasDraft('');
    if (key === normalizeName(name) || aliases.some(a => normalizeName(a) === key)) return;
    const owner = index.byKey.get(key);
    if (owner) {
      alert(`「${value}」已經是「${owner.name}」的名稱或別名。要合併成同一個人請用下方的「合併到…」。`);
      return;
    }
    setAliases([...aliases, value]);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const owner = index.byKey.get(normalizeName(trimmed));
    if (owner) {
      alert(`「${trimmed}」已經是「${owner.name}」的名稱或別名，請改用「合併到…」。`);
      return;
    }
    onSave({ name: trimmed, aliases, groupIds, reviewed: true });
  };

  // A group you haven't logged any show for yet won't exist as an artist, so
  // allow creating it here instead of forcing a dummy show first.
  const pickGroup = (name: string) => {
    const existing = findArtist(buildArtistIndex(artists), name);
    if (existing?.id === artist.id) {
      alert('不能把自己設為自己的團體。');
      return;
    }
    const group = existing ?? newArtist(artists, name);
    if (!existing) onCreate(group);
    if (!groupIds.includes(group.id)) setGroupIds([...groupIds, group.id]);
  };

  const remove = () => {
    if (usageCount > 0) {
      alert(`還有 ${usageCount} 筆資料指向「${artist.name}」，請先合併到其他藝人。`);
      return;
    }
    if (confirm(`刪除「${artist.name}」？`)) onRemove();
  };

  const merge = (target: Artist) => {
    const ok = confirm(
      `把「${artist.name}」併入「${target.name}」？\n\n` +
      `「${artist.name}」和它的別名會變成「${target.name}」的別名，` +
      `${usageCount} 筆資料會改指向「${target.name}」，然後「${artist.name}」會被刪除。`
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
        <p className="text-[10px] text-gray-400 mb-1">別名 — 之後輸入這些字也會跳出這位藝人</p>
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
            placeholder="例如 온유、李珍基" className="flex-1 border rounded-lg px-2 py-1.5 text-xs" />
          <button type="button" onClick={addAlias}
            className="text-xs bg-gray-100 text-gray-600 px-3 rounded-lg">+</button>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-gray-400 mb-1">所屬團體 — 這位的場次會算進團體，團體的不會算回來</p>
        <div className="flex flex-wrap gap-1 mb-1">
          {groupIds.map(id => {
            const group = artists.find(a => a.id === id);
            return group ? (
              <span key={id} className="text-xs bg-blue-100 text-blue-700 pl-2 pr-1 py-0.5 rounded-full flex items-center gap-1">
                {group.name}
                <button type="button" onClick={() => setGroupIds(groupIds.filter(g => g !== id))}
                  className="opacity-50 px-0.5">✕</button>
              </span>
            ) : null;
          })}
        </div>
        <ArtistSelect artists={others} exclude={[...groupIds, ...memberIds]} placeholder="搜尋或新增團體"
          onPick={group => pickGroup(group.name)}
          createLabel="新增並設為團體" onCreate={pickGroup} />
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
      {merging && (
        <ArtistSelect artists={others} exclude={[]} placeholder="要併入哪一位？" onPick={merge} />
      )}
    </div>
  );
}
