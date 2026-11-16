import { useEffect, useMemo, useState } from 'react';
import { Show, ShowCategory, Venue } from '../../types';
import { SHOW_CATEGORIES } from '../../utils/constants';
import { buildSummary, summaryFileBase, summaryToImage, summaryToText } from '../../utils/exportSummary';
import { copyText, saveFile } from '../../utils/share';

interface Props {
  shows: Show[]; // already limited to ticketed shows in the chosen period
  venues: Venue[];
  year: number;
  month: number | null;
  onClose: () => void;
}

export default function ExportPanel({ shows, venues, year, month, onClose }: Props) {
  const available = useMemo(() => {
    const present = new Set(shows.map(s => s.category || 'other'));
    return SHOW_CATEGORIES.filter(c => present.has(c.value));
  }, [shows]);
  const [categories, setCategories] = useState<ShowCategory[]>(() => available.map(c => c.value));
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<Blob | null>(null);
  const [showPrice, setShowPrice] = useState(true);

  const summary = useMemo(
    () => buildSummary(shows, venues, { year, month, categories }),
    [shows, venues, year, month, categories],
  );
  const text = useMemo(() => summaryToText(summary, { showPrice }), [summary, showPrice]);
  const fileBase = summaryFileBase(year, month);

  // Render the image ahead of the tap: iOS only opens the share sheet if it is
  // called right after the user's gesture, so there's no time to draw then.
  useEffect(() => {
    let cancelled = false;
    setImage(null);
    if (summary.count === 0) return;
    summaryToImage(summary, { showPrice }).then(blob => { if (!cancelled) setImage(blob); }).catch(() => {});
    return () => { cancelled = true; };
  }, [summary, showPrice]);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const allSelected = available.every(c => categories.includes(c.value));
  const toggleAll = () => setCategories(allSelected ? [] : available.map(c => c.value));

  const toggle = (value: ShowCategory) =>
    setCategories(categories.includes(value) ? categories.filter(c => c !== value) : [...categories, value]);

  const handleCopy = async () => flash((await copyText(text)) ? '已複製' : '複製失敗');
  const handleTxt = async () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    if (await saveFile(blob, `${fileBase}.txt`)) flash('已存成 txt');
  };
  const handleImage = async () => {
    if (!image) return;
    if (await saveFile(image, `${fileBase}.jpg`)) flash('已存成圖片');
  };

  const empty = summary.count === 0;
  const btn = 'flex-1 text-xs py-2 rounded-full border disabled:opacity-40';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[85vh] flex flex-col p-4 pb-20"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h2 className="text-base font-bold">匯出 {summary.title}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>

        <div className="flex items-start gap-2 mb-3 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {available.map(c => (
              <button key={c.value} onClick={() => toggle(c.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  categories.includes(c.value) ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
          <button onClick={toggleAll} className="text-xs text-gray-400 py-1 flex-shrink-0">
            {allSelected ? '全不選' : '全選'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600 mb-3 flex-shrink-0">
          <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)}
            className="accent-purple-600" />
          顯示金額
        </label>

        <p className="text-[10px] text-gray-400 mb-1 flex-shrink-0">
          預覽{showPrice && ' · 金額只含票價，不含其他花費'}
        </p>
        <pre className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-3 text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap font-sans">
          {empty ? '沒有可匯出的演出' : text}
        </pre>

        <div className="flex gap-2 mt-3 flex-shrink-0">
          <button onClick={handleCopy} disabled={empty} className={`${btn} border-gray-300 text-gray-600`}>
            複製文字
          </button>
          <button onClick={handleTxt} disabled={empty} className={`${btn} border-gray-300 text-gray-600`}>
            存成 txt
          </button>
          <button onClick={handleImage} disabled={empty || !image} className={`${btn} border-purple-300 text-purple-600`}>
            {!empty && !image ? '產生中…' : '存成圖片'}
          </button>
        </div>
        {message && <p className="text-xs text-center text-purple-600 mt-2 flex-shrink-0">{message}</p>}
      </div>
    </div>
  );
}
