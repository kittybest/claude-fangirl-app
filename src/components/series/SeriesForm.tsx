import { useState } from 'react';
import { Series, Show, Artist, Venue } from '../../types';
import { buildArtistIndex, displayNames } from '../../utils/artists';
import { buildVenueIndex, displayVenue } from '../../utils/venues';
import ArtistInput from '../ui/ArtistInput';
import VenueInput from '../ui/VenueInput';
import { parseSeriesImport, SERIES_IMPORT_PROMPT } from '../../utils/seriesImport';

interface SeriesItem {
  id?: string; // existing show id, undefined for new
  date: string;
  venue: string;
}

interface Props {
  initial?: { series: Series; shows: Show[] };
  allArtists?: Artist[];
  allVenues?: Venue[];
  onSave: (title: string, artists: string[], items: SeriesItem[]) => void;
  onClose: () => void;
}

export default function SeriesForm({ initial, allArtists = [], allVenues = [], onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.series.title ?? '');
  const [artists, setArtists] = useState<string[]>(() => {
    const first = initial?.shows[0];
    return first ? displayNames(buildArtistIndex(allArtists), first) : [];
  });
  const [items, setItems] = useState<SeriesItem[]>(
    initial
      ? initial.series.showIds
          .map(id => initial.shows.find(s => s.id === id))
          .filter(Boolean)
          .map(s => ({
            id: s!.id,
            date: s!.date,
            venue: displayVenue(buildVenueIndex(allVenues), s!)?.name || '',
          }))
      : [{ date: '', venue: '' }]
  );

  const isEdit = !!initial;

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<{ line: number; text: string }[]>([]);
  const [promptCopied, setPromptCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(SERIES_IMPORT_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      alert('無法複製，請手動複製：\n\n' + SERIES_IMPORT_PROMPT);
    }
  };

  // Appends parsed rows; blank rows already in the list are dropped first
  const runImport = () => {
    const { items: parsed, errors } = parseSeriesImport(importText);
    setImportErrors(errors);
    if (parsed.length > 0) {
      setItems(prev => [...prev.filter(item => item.date || item.venue.trim()), ...parsed]);
    }
    // Keep only the failed lines, so fixing them and parsing again won't duplicate the rest
    setImportText(errors.map(err => err.text).join('\n'));
    if (errors.length === 0) setImportOpen(false);
  };

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
    onSave(title, artists, validItems);
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
          <ArtistInput value={artists} artists={allArtists} onChange={setArtists} placeholder="演出者 (選填)" />

          {!isEdit && (
            <div className="border-t pt-2">
              <button type="button" onClick={() => setImportOpen(!importOpen)}
                className="text-xs text-purple-500 border border-purple-300 rounded-full px-2.5 py-1">
                {importOpen ? '收起匯入' : '貼上匯入'}
              </button>
              {importOpen && (
                <div className="mt-2 space-y-1.5">
                  <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={5}
                    placeholder={'一行一場，例如：\n2027-01-16~01-17 曼谷\n2027-02-27 雪梨'}
                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono" />
                  <div className="flex gap-2">
                    <button type="button" onClick={copyPrompt}
                      className="text-xs text-gray-600 border border-gray-300 rounded-full px-2.5 py-1">
                      {promptCopied ? '已複製' : '複製提示詞'}
                    </button>
                    <button type="button" onClick={runImport} disabled={!importText.trim()}
                      className="text-xs text-white bg-purple-500 rounded-full px-3 py-1 disabled:bg-gray-300">解析</button>
                  </div>
                  {importErrors.length > 0 && (
                    <div className="text-[10px] text-red-500 space-y-0.5">
                      <p>{importErrors.length} 行無法解析，已留在框內，修正後可再按解析；其餘已加入列表</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                <div className="flex-1">
                  <VenueInput value={item.venue} venues={allVenues}
                    onChange={value => updateItem(i, 'venue', value)}
                    placeholder="地點" className="w-full border rounded-lg px-2 py-1.5 text-xs" />
                </div>
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
