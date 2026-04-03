import { useState } from 'react';
import { Show, Expense } from '../../types';
import { SHOW_CATEGORIES } from '../../utils/constants';

interface Props {
  shows: Show[];
  expenses: Expense[];
}

export default function StatsView({ shows, expenses }: Props) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null); // null = full year

  const filteredShows = shows.filter(s => {
    const y = parseInt(s.date.slice(0, 4));
    const m = parseInt(s.date.slice(5, 7));
    return y === year && (month === null || m === month) && s.status !== 'cancelled';
  });

  const filteredExpenses = expenses.filter(e => {
    const y = parseInt(e.date.slice(0, 4));
    const m = parseInt(e.date.slice(5, 7));
    return y === year && (month === null || m === month);
  });

  // Show ticket expenses (non-cancelled shows with price)
  const showTicketTWD = shows
    .filter(s => {
      const y = parseInt(s.date.slice(0, 4));
      const m = parseInt(s.date.slice(5, 7));
      return y === year && (month === null || m === month);
    })
    .reduce((sum, s) => {
      if (s.status === 'cancelled') {
        const buy = s.ticketPriceTWD || 0;
        const sell = s.resalePriceTWD || 0;
        return sum + (buy - sell); // net cost
      }
      return sum + (s.ticketPriceTWD || 0);
    }, 0);

  const expenseTWD = filteredExpenses.reduce((sum, e) => sum + e.amountTWD, 0);
  const totalTWD = showTicketTWD + expenseTWD;

  // By expense category
  const byCategory: Record<string, number> = {};
  if (showTicketTWD > 0) byCategory['門票 (演出)'] = showTicketTWD;
  for (const e of filteredExpenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amountTWD;
  }

  // By artist
  const byArtist: Record<string, { count: number; spent: number }> = {};
  for (const s of filteredShows) {
    for (const a of s.artists) {
      if (!byArtist[a]) byArtist[a] = { count: 0, spent: 0 };
      byArtist[a].count++;
      byArtist[a].spent += s.ticketPriceTWD || 0;
    }
  }
  for (const e of filteredExpenses) {
    for (const a of e.artists) {
      if (!byArtist[a]) byArtist[a] = { count: 0, spent: 0 };
      byArtist[a].spent += e.amountTWD;
    }
  }

  // By show category
  const byShowCategory: Record<string, number> = {};
  for (const s of filteredShows) {
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
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Total */}
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-400">總花費</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">NT${totalTWD.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            演出 {filteredShows.length} 場
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
                <span key={cat} className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">
                  {SHOW_CATEGORIES.find(c => c.value === cat)?.label || cat} {count}場
                </span>
              ))}
            </div>
          </div>
        )}

        {/* By artist */}
        {Object.keys(byArtist).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-2">藝人/演出者</h3>
            {Object.entries(byArtist).sort((a, b) => b[1].count - a[1].count).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{name}</span>
                <div className="text-right">
                  <span className="text-xs text-purple-600 font-medium">{data.count}場</span>
                  {data.spent > 0 && (
                    <span className="text-[10px] text-gray-400 ml-2">NT${data.spent.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredShows.length === 0 && filteredExpenses.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">這段期間沒有資料</p>
        )}
      </div>
    </div>
  );
}
