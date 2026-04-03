import { useState } from 'react';
import { Expense, ExpenseCategory, Currency } from '../../types';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { CURRENCIES, convertToTWD } from '../../utils/currency';

interface Props {
  initial?: Expense;
  onSave: (expense: Omit<Expense, 'id'>) => void;
  onClose: () => void;
}

export default function ExpenseForm({ initial, onSave, onClose }: Props) {
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? '門票');
  const [artists, setArtists] = useState(initial?.artists.join(', ') ?? '');
  const [amount, setAmount] = useState(initial?.amount.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'TWD');
  const [amountTWD, setAmountTWD] = useState(initial?.amountTWD?.toString() ?? '');

  const autoTWD = amount ? convertToTWD(parseFloat(amount) || 0, currency) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    onSave({
      description, date, category,
      artists: artists ? artists.split(',').map(a => a.trim()).filter(Boolean) : [],
      amount: parseFloat(amount),
      currency,
      amountTWD: amountTWD ? parseInt(amountTWD) : autoTWD,
      notes: undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[85vh] flex flex-col p-4 pb-20">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h2 className="text-base font-bold">{initial ? '編輯花費' : '新增花費'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2.5 overflow-y-auto flex-1 pb-2">
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="描述 *" required
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-1.5 flex-wrap">
            {EXPENSE_CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  category === c ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
                }`}>
                {c}
              </button>
            ))}
          </div>
          <input value={artists} onChange={e => setArtists(e.target.value)} placeholder="對象/藝人 (逗號分隔，選填)"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="金額 *" required className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
              className="w-20 border rounded-lg px-2 py-2 text-sm bg-white">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">台幣換算:</span>
            <input type="number" value={amountTWD || autoTWD || ''} onChange={e => setAmountTWD(e.target.value)}
              placeholder={autoTWD.toString()} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <span className="text-xs text-gray-400">TWD</span>
          </div>
        </form>
        <button onClick={handleSubmit} className="w-full bg-purple-500 text-white rounded-full py-2.5 text-sm font-medium flex-shrink-0 mt-2">
          {initial ? '儲存' : '新增'}
        </button>
      </div>
    </div>
  );
}
