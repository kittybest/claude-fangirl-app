import { useState } from 'react';
import { Show, Series } from '../../types';
import { STATUS_CONFIG } from '../../utils/constants';

type SubTab = 'series' | 'artists';

interface Props {
  shows: Show[];
  series: Series[];
  isAuthorized: boolean;
  onDeleteSeries: (id: string) => void;
}

export default function ListView({ shows, series, isAuthorized, onDeleteSeries }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('series');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  // Build artist -> shows map
  const artistMap: Record<string, Show[]> = {};
  for (const s of shows) {
    for (const a of s.artists) {
      if (!artistMap[a]) artistMap[a] = [];
      artistMap[a].push(s);
    }
  }
  const sortedArtists = Object.entries(artistMap).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3">
        <h2 className="text-base font-bold mb-2">列表</h2>
        <div className="flex gap-1">
          <button onClick={() => setSubTab('series')}
            className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
              subTab === 'series' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
            }`}>
            依系列
          </button>
          <button onClick={() => setSubTab('artists')}
            className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
              subTab === 'artists' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
            }`}>
            依藝人
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === 'series' ? (
          (series || []).length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-8">沒有系列</p>
          ) : (
            <div className="divide-y">
              {(series || []).map(sr => {
                const srShows = sr.showIds
                  .map(id => shows.find(s => s.id === id))
                  .filter(Boolean) as Show[];
                const isOpen = expandedId === sr.id;
                return (
                  <div key={sr.id} className="bg-white">
                    <button onClick={() => toggle(sr.id)}
                      className="w-full px-4 py-3 flex items-center gap-2 text-left">
                      <span className="text-xs text-gray-400">{isOpen ? '▼' : '▶'}</span>
                      <span className="text-sm font-medium text-gray-800 flex-1">{sr.title}</span>
                      <span className="text-xs text-gray-400">{srShows.length}場</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3">
                        {srShows.sort((a, b) => a.date.localeCompare(b.date)).map(s => (
                          <ShowRow key={s.id} show={s} />
                        ))}
                        {isAuthorized && (
                          <button onClick={() => { if (confirm(`刪除「${sr.title}」系列及所有關聯演出？`)) onDeleteSeries(sr.id); }}
                            className="text-xs text-red-400 border border-red-300 rounded-full px-3 py-1 mt-2">
                            刪除系列
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          sortedArtists.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-8">沒有藝人資料</p>
          ) : (
            <div className="divide-y">
              {sortedArtists.map(([artist, artistShows]) => {
                const isOpen = expandedId === `artist-${artist}`;
                return (
                  <div key={artist} className="bg-white">
                    <button onClick={() => toggle(`artist-${artist}`)}
                      className="w-full px-4 py-3 flex items-center gap-2 text-left">
                      <span className="text-xs text-gray-400">{isOpen ? '▼' : '▶'}</span>
                      <span className="text-sm font-medium text-gray-800 flex-1">{artist}</span>
                      <span className="text-xs text-gray-400">{artistShows.length}場</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3">
                        {artistShows.sort((a, b) => a.date.localeCompare(b.date)).map(s => (
                          <ShowRow key={s.id} show={s} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
}

function ShowRow({ show }: { show: Show }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[show.status].dot}`} />
      <span className="text-xs text-gray-600 w-20 flex-shrink-0">{show.date}</span>
      <span className="text-xs text-gray-800 flex-1 truncate">{show.title}</span>
      {show.venue && <span className="text-[10px] text-gray-400 flex-shrink-0">{show.venue}</span>}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[show.status].color}`}>
        {STATUS_CONFIG[show.status].label}
      </span>
    </div>
  );
}
