import { useState } from 'react';
import { Expense, Show } from '../../types';
import { showCategoryToExpenseCategory } from '../../utils/constants';
import ExpenseForm from './ExpenseForm';

interface Props {
  expenses: Expense[];
  shows: Show[];
  isAuthorized: boolean;
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Omit<Expense, 'id'>>) => void;
  onDelete: (id: string) => void;
}

interface DisplayExpense {
  id: string;
  description: string;
  date: string;
  category: string;
  artists: string[];
  amount: number;
  currency: string;
  amountTWD: number;
  isFromShow: boolean;
}

export default function ExpenseList({ expenses, shows, isAuthorized, onAdd, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Merge show ticket prices into expense list
  const showExpenses: DisplayExpense[] = shows
    .filter(s => s.ticketPriceTWD && s.ticketPriceTWD > 0)
    .map(s => {
      const netPrice = s.status === 'cancelled'
        ? (s.ticketPriceTWD || 0) - (s.resalePriceTWD || 0)
        : s.ticketPriceTWD!;
      return {
        id: `show-${s.id}`,
        description: s.title + (s.status === 'cancelled' ? ' (轉售)' : ''),
        date: s.date,
        category: showCategoryToExpenseCategory(s.category),
        artists: s.artists,
        amount: s.status === 'cancelled'
          ? (s.ticketPrice || 0) - (s.resalePrice || 0)
          : s.ticketPrice!,
        currency: s.ticketCurrency || 'TWD',
        amountTWD: netPrice,
        isFromShow: true,
      };
    });

  const manualExpenses: DisplayExpense[] = expenses.map(e => ({
    ...e,
    isFromShow: false,
  }));

  const allExpenses = [...showExpenses, ...manualExpenses]
    .filter(e => e.date.startsWith(filterMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  const monthTotal = allExpenses.reduce((sum, e) => sum + e.amountTWD, 0);

  const byCategory = allExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amountTWD;
    return acc;
  }, {});

  const editing = editingId ? expenses.find(e => e.id === editingId) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">記帳</h2>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-purple-600">NT${monthTotal.toLocaleString()}</span>
          <span className="text-xs text-gray-400">本月花費</span>
        </div>
        {Object.keys(byCategory).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <span key={cat} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {cat} NT${amt.toLocaleString()}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {allExpenses.length === 0 ? (
          <p className="text-gray-400 text-xs text-center py-8">這個月沒有花費紀錄</p>
        ) : (
          <div className="divide-y">
            {allExpenses.map(e => (
              <div key={e.id} className="px-4 py-2.5 bg-white flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.isFromShow ? 'bg-green-400' : 'bg-orange-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{e.description}</p>
                  <p className="text-[10px] text-gray-400">
                    {e.date} · {e.category}
                    {e.artists.length > 0 && ` · ${e.artists.join(', ')}`}
                    {e.isFromShow && ' · 演出'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700">{e.currency} {e.amount.toLocaleString()}</p>
                  {e.currency !== 'TWD' && (
                    <p className="text-[10px] text-gray-400">≈NT${e.amountTWD.toLocaleString()}</p>
                  )}
                </div>
                {isAuthorized && !e.isFromShow && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditingId(e.id)} className="text-[10px] text-purple-500 border border-purple-300 rounded-full px-2 py-1">編輯</button>
                    <button onClick={() => onDelete(e.id)} className="text-[10px] text-red-400 border border-red-300 rounded-full px-2 py-1">刪除</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {isAuthorized && (
        <button
          onClick={() => setAdding(true)}
          className="fixed bottom-16 right-4 w-11 h-11 rounded-full bg-purple-500 text-white shadow-lg text-xl flex items-center justify-center z-40"
        >
          +
        </button>
      )}

      {adding && (
        <ExpenseForm
          onSave={exp => { onAdd(exp); setAdding(false); }}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <ExpenseForm
          initial={editing}
          onSave={exp => { onUpdate(editing.id, exp); setEditingId(null); }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
