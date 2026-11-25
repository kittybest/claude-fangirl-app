import { useMemo, useState } from 'react';
import { Show, Series, Run, Artist, Venue } from '../../types';
import { buildVenueIndex } from '../../utils/venues';
import ShowList, { ShowFilters, ShowRow } from './ShowList';
import RunList from './RunList';

type SubTab = 'series' | 'shows' | 'runs';

interface Props {
  shows: Show[];
  series: Series[];
  runs: Run[];
  allArtists: Artist[];
  allVenues: Venue[];
  isAuthorized: boolean;
  onEditSeries: (series: Series) => void;
  onDeleteSeries: (id: string) => void;
  onAddRun: () => void;
  onEditRun: (run: Run) => void;
  onDeleteRun: (id: string) => void;
  onAddShowFromRun: (run: Run) => void;
  expandSeriesId?: string | null;
  initialShowFilters?: Partial<ShowFilters> | null;
}

export default function ListView({ shows, series, runs, allArtists, allVenues, isAuthorized, onEditSeries, onDeleteSeries, onAddRun, onEditRun, onDeleteRun, onAddShowFromRun, expandSeriesId, initialShowFilters }: Props) {
  const venueIndex = useMemo(() => buildVenueIndex(allVenues), [allVenues]);
  // Coming from the calendar's series link opens 依系列; everything else lands on the show list.
  const [subTab, setSubTab] = useState<SubTab>(expandSeriesId ? 'series' : 'shows');
  const [expandedId, setExpandedId] = useState<string | null>(expandSeriesId ?? null);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3">
        <h2 className="text-base font-bold mb-2">列表</h2>
        <div className="flex gap-1">
          <button onClick={() => setSubTab('shows')}
            className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
              subTab === 'shows' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
            }`}>
            演出列表
          </button>
          <button onClick={() => setSubTab('series')}
            className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
              subTab === 'series' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
            }`}>
            依系列
          </button>
          <button onClick={() => setSubTab('runs')}
            className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
              subTab === 'runs' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
            }`}>
            檔期
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === 'runs' ? (
          <RunList runs={runs} shows={shows} allVenues={allVenues} isAuthorized={isAuthorized}
            onAddRun={onAddRun} onEditRun={onEditRun} onDeleteRun={onDeleteRun} onAddShow={onAddShowFromRun} />
        ) : subTab === 'series' ? (
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
                          <ShowRow key={s.id} show={s} venueIndex={venueIndex} />
                        ))}
                        {isAuthorized && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => onEditSeries(sr)}
                              className="text-xs text-purple-500 border border-purple-300 rounded-full px-3 py-1">
                              編輯系列
                            </button>
                            <button onClick={() => { if (confirm(`刪除「${sr.title}」系列及所有關聯演出？`)) onDeleteSeries(sr.id); }}
                              className="text-xs text-red-400 border border-red-300 rounded-full px-3 py-1">
                              刪除系列
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <ShowList shows={shows} allArtists={allArtists} allVenues={allVenues}
            initialFilters={initialShowFilters ?? undefined} />
        )}
      </div>

    </div>
  );
}
