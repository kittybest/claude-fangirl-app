import { useState } from 'react';
import { Show, Expense, Artist, Venue, ShowCategory } from '../../types';
import { SHOW_CATEGORIES, showCategoryToExpenseCategory } from '../../utils/constants';
import { aggregateByArtist, ArtistBucket } from '../../utils/artists';
import { aggregateByCity, aggregateByVenue } from '../../utils/venues';
import ExportPanel from './ExportPanel';
import { ShowFilters } from '../series/ShowList';

type BreakdownTab = 'artists' | 'venues' | 'cities';

interface Props {
  shows: Show[];
  expenses: Expense[];
  artists: Artist[];
  venues: Venue[];
  onOpenShowList: (filters: Partial<ShowFilters>) => void;
}

export default function StatsView({ shows, expenses, artists, venues, onOpenShowList }: Props) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null); // null = full year
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownTab>('artists');
  const [exporting, setExporting] = useState(false);

  // Only count ticketed and cancelled for stats (not interested)
  const filteredShows = shows.filter(s => {
    const y = parseInt(s.date.slice(0, 4));
    const m = parseInt(s.date.slice(5, 7));
    return y === year && (month === null || m === month) && s.status !== 'interested';
  });
  const attendedShows = filteredShows.filter(s => s.status === 'ticketed');

  const filteredExpenses = expenses.filter(e => {
    const y = parseInt(e.date.slice(0, 4));
    const m = parseInt(e.date.slice(5, 7));
    return y === year && (month === null || m === month);
  });

  // Show ticket expenses (only ticketed + cancelled, not interested)
  const showTicketTWD = filteredShows.reduce((sum, s) => {
    if (s.status === 'cancelled') {
      return sum + ((s.ticketPriceTWD || 0) - (s.resalePriceTWD || 0));
    }
    return sum + (s.ticketPriceTWD || 0);
  }, 0);

  const expenseTWD = filteredExpenses.reduce((sum, e) => sum + e.amountTWD, 0);
  const totalTWD = showTicketTWD + expenseTWD;

  // By expense category
  // By expense category — group show tickets by their mapped category
  const byCategory: Record<string, number> = {};
  for (const s of filteredShows) {
    const cat = showCategoryToExpenseCategory(s.category);
    const net = s.status === 'cancelled'
      ? (s.ticketPriceTWD || 0) - (s.resalePriceTWD || 0)
      : (s.ticketPriceTWD || 0);
    if (net > 0) byCategory[cat] = (byCategory[cat] || 0) + net;
  }
  for (const e of filteredExpenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amountTWD;
  }

  const artistRows = aggregateByArtist(artists, attendedShows, filteredExpenses);
  const venueRows = aggregateByVenue(venues, attendedShows);
  const cityRows = aggregateByCity(venues, attendedShows);
  const namedCities = cityRows.filter(row => row.city).length;

  // By show category
  const byShowCategory: Record<string, number> = {};
  for (const s of attendedShows) {
    const cat = s.category || 'other';
    byShowCategory[cat] = (byShowCategory[cat] || 0) + 1;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">統計</h2>
          <div className="flex gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="border rounded-lg px-2 py-1 text-xs bg-white">
              {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
            </select>
            <select value={month ?? ''} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}
              className="border rounded-lg px-2 py-1 text-xs bg-white">
              <option value="">全年</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
            <button onClick={() => setExporting(true)} disabled={attendedShows.length === 0}
              className="text-xs text-purple-600 border border-purple-300 rounded-lg px-2.5 py-1 disabled:opacity-40">
              匯出
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Total */}
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-400">總花費</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">NT${totalTWD.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            演出 {attendedShows.length} 場
            {venueRows.length > 0 && ` · ${venueRows.length} 個場地`}
            {namedCities > 0 && ` · ${namedCities} 個城市`}
          </p>
        </div>

        {/* By category */}
        {Object.keys(byCategory).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-2">花費分類</h3>
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const pct = totalTWD > 0 ? (amt / totalTWD * 100) : 0;
              return (
                <div key={cat} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600">{cat}</span>
                    <span className="text-gray-700 font-medium">NT${amt.toLocaleString()} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* By show category */}
        {Object.keys(byShowCategory).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-2">演出類型</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byShowCategory).map(([cat, count]) => (
                <button key={cat}
                  onClick={() => onOpenShowList({
                    time: 'all', year, month, statuses: ['ticketed'], categories: [cat as ShowCategory], artistId: null,
                  })}
                  className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full active:bg-purple-100">
                  {SHOW_CATEGORIES.find(c => c.value === cat)?.label || cat} {count}場 ›
                </button>
              ))}
            </div>
          </div>
        )}

        {/* By artist / venue / city */}
        {(artistRows.length > 0 || venueRows.length > 0) && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex gap-1 mb-2">
              {([
                ['artists', '藝人'],
                ['venues', '場地'],
                ['cities', '城市'],
              ] as [BreakdownTab, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setBreakdown(key)}
                  className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
                    breakdown === key ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {breakdown === 'venues' && (
              venueRows.length === 0
                ? <p className="text-gray-400 text-xs text-center py-4">沒有場地資料</p>
                : venueRows.map(row => (
                  <div key={row.key} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 truncate">
                      {row.name}
                      {row.city && <span className="text-[10px] text-gray-400 ml-1.5">{row.city}</span>}
                    </span>
                    <span className="text-xs text-purple-600 font-medium flex-shrink-0">{row.count}場</span>
                  </div>
                ))
            )}

            {breakdown === 'cities' && (
              cityRows.length === 0
                ? <p className="text-gray-400 text-xs text-center py-4">沒有城市資料</p>
                : cityRows.map(row => (
                  <div key={row.city ?? '_'} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className={`text-sm truncate ${row.city ? 'text-gray-700' : 'text-gray-400'}`}>
                      {row.city ?? '未設定'}
                    </span>
                    <span className="text-xs text-purple-600 font-medium flex-shrink-0">{row.count}場</span>
                  </div>
                ))
            )}

            {breakdown === 'artists' && artistRows.length === 0 && (
              <p className="text-gray-400 text-xs text-center py-4">沒有藝人資料</p>
            )}
            {breakdown === 'artists' && artistRows.map(row => {
              const isOpen = expandedArtist === row.key;
              return (
                <div key={row.key} className="border-b border-gray-50 last:border-0">
                  <div
                    onClick={() => row.members.length > 0 && setExpandedArtist(isOpen ? null : row.key)}
                    className={`flex items-center justify-between py-1.5 ${row.members.length > 0 ? 'cursor-pointer' : ''}`}>
                    <span className="text-sm text-gray-700">
                      {row.members.length > 0 && (
                        <span className="text-[10px] text-gray-400 mr-1">{isOpen ? '▼' : '▶'}</span>
                      )}
                      {row.name}
                    </span>
                    <div className="text-right">
                      <span className="text-xs text-purple-600 font-medium">{row.total.count}場</span>
                      {row.total.spent > 0 && (
                        <span className="text-[10px] text-gray-400 ml-2">NT${row.total.spent.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="pb-1.5 pl-4">
                      <StatLine label="直接" bucket={row.direct} />
                      {row.members.map(member => (
                        <StatLine key={member.id} label={member.name} bucket={member.bucket} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {breakdown === 'artists' && artistRows.some(r => r.members.length > 0) && (
          <p className="text-[10px] text-gray-400 text-center">
            團體的數字含成員場次，同一場只算一次；成員那列只算標到本人的
          </p>
        )}

        {filteredShows.length === 0 && filteredExpenses.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">這段期間沒有資料</p>
        )}
      </div>

      {exporting && (
        <ExportPanel shows={attendedShows} venues={venues} year={year} month={month}
          onClose={() => setExporting(false)} />
      )}
    </div>
  );
}

function StatLine({ label, bucket }: { label: string; bucket: ArtistBucket }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-[11px] text-gray-500">{bucket.count}場</span>
        {bucket.spent > 0 && (
          <span className="text-[10px] text-gray-400 ml-2">NT${bucket.spent.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
