import { useState } from 'react';
import { Series, Show } from '../../types';

interface SeriesItem {
  id?: string; // existing show id, undefined for new
  date: string;
  venue: string;
}

interface Props {
  initial?: { series: Series; shows: Show[] };
  onSave: (title: string, artists: string[], items: SeriesItem[]) => void;
  onClose: () => void;
}

export default function SeriesForm({ initial, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.series.title ?? '');
  const [artists, setArtists] = useState(
    initial?.shows[0]?.artists.join(', ') ?? ''
  );
  const [items, setItems] = useState<SeriesItem[]>(
    initial
      ? initial.series.showIds
          .map(id => initial.shows.find(s => s.id === id))
          .filter(Boolean)
          .map(s => ({ id: s!.id, date: s!.date, venue: s!.venue || '' }))
      : [{ date: '', venue: '' }]
  );

  const isEdit = !!initial;

  const addItem = () => setItems([...items, { date: '', venue: '' }]);

  const updateItem = (index: number, field: 'date' | 'venue', value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(item => item.date);
    if (!title || validItems.length === 0) return;
    onSave(
      title,
      artists ? artists.split(',').map(a => a.trim()).filter(Boolean) : [],
      validItems,
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[85vh] flex flex-col p-4 pb-20">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h2 className="text-base font-bold">{isEdit ? '編輯系列' : '新增系列'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2.5 overflow-y-auto flex-1 pb-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="系列名稱 * (e.g. ATEEZ World Tour)"
            required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={artists} onChange={e => setArtists(e.target.value)} placeholder="演出者 (逗號分隔，選填)"
            className="w-full border rounded-lg px-3 py-2 text-sm" />

          <div className="border-t pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">場次列表</p>
              <button type="button" onClick={addItem}
                className="text-xs text-blue-500 border border-blue-300 rounded-full px-2.5 py-1">+ 新增場次</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-1.5 mb-2 items-center">
                <input type="date" value={item.date} onChange={e => updateItem(i, 'date', e.target.value)}
                  required className="flex-1 border rounded-lg px-2 py-1.5 text-xs" />
                <input value={item.venue} onChange={e => updateItem(i, 'venue', e.target.value)}
                  placeholder="地點" className="flex-1 border rounded-lg px-2 py-1.5 text-xs" />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    className="text-red-400 text-xs px-1">✕</button>
                )}
              </div>
            ))}
          </div>
        </form>
        <button onClick={handleSubmit}
          className="w-full bg-purple-500 text-white rounded-full py-2.5 text-sm font-medium flex-shrink-0 mt-2">
          {isEdit ? '儲存' : `新增 ${items.filter(i => i.date).length} 場演出`}
        </button>
      </div>
    </div>
  );
}
