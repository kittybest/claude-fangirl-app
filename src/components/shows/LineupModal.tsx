import { useMemo, useState } from 'react';
import { LineupSlot, Show } from '../../types';
import { generateId } from '../../utils/id';
import {
  LINEUP_IMPORT_PROMPT, displayTime, keepStars, parseLineupImport, sortSlots, timeToMinutes,
} from '../../utils/lineupImport';

interface Props {
  show: Show;
  isAuthorized: boolean;
  onChange: (lineup: LineupSlot[]) => void;
  onClose: () => void;
}

type Tab = 'all' | 'mine';

interface Draft {
  id?: string;
  start: string;
  end: string;
  stage: string;
  artist: string;
}

const emptyDraft: Draft = { start: '', end: '', stage: '', artist: '' };

const endMinutes = (s: LineupSlot) => (s.end ? timeToMinutes(s.end) : timeToMinutes(s.start));

const timeRange = (s: LineupSlot) => `${displayTime(s.start)}${s.end ? ` - ${displayTime(s.end)}` : ''}`;

export default function LineupModal({ show, isAuthorized, onChange, onClose }: Props) {
  const lineup = useMemo(() => sortSlots(show.lineup ?? []), [show.lineup]);
  const stages = useMemo(() => [...new Set(lineup.map(s => s.stage))], [lineup]);
  const starredCount = lineup.filter(s => s.starred).length;

  const [tab, setTab] = useState<Tab>(starredCount > 0 ? 'mine' : 'all');
  const [stage, setStage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(lineup.length === 0 && isAuthorized);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState(0);
  const [promptCopied, setPromptCopied] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const visible = tab === 'mine'
    ? lineup.filter(s => s.starred)
    : stage ? lineup.filter(s => s.stage === stage) : lineup;

  // Starred acts that overlap another starred act
  const conflicts = useMemo(() => {
    const mine = lineup.filter(s => s.starred);
    const ids = new Set<string>();
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        const a = mine[i];
        const b = mine[j];
        const overlap = a.start === b.start ||
          (timeToMinutes(a.start) < endMinutes(b) && timeToMinutes(b.start) < endMinutes(a));
        if (overlap) { ids.add(a.id); ids.add(b.id); }
      }
    }
    return ids;
  }, [lineup]);

  const toggleStar = (id: string) => {
    if (!isAuthorized) return;
    onChange(lineup.map(s => (s.id === id ? { ...s, starred: !s.starred } : s)));
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(LINEUP_IMPORT_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      alert('無法複製，請手動複製：\n\n' + LINEUP_IMPORT_PROMPT);
    }
  };

  const runImport = () => {
    const { slots, errors } = parseLineupImport(importText);
    if (slots.length > 0) {
      if (lineup.length > 0 && !confirm(`取代目前的 ${lineup.length} 組節目表？同舞台同藝人的星號會保留。`)) return;
      onChange(keepStars(lineup, slots));
    }
    setImportErrors(errors.length);
    // Keep only the failed lines so they can be fixed and parsed again
    setImportText(errors.join('\n'));
    if (errors.length === 0) setImportOpen(false);
  };

  const saveDraft = () => {
    if (!draft) return;
    const start = draft.start.trim();
    const stageName = draft.stage.trim();
    const artist = draft.artist.trim();
    if (!start || !stageName || !artist) return;
    // Reuse the import parser so manual entries follow the same time rules
    const line = `${start}${draft.end.trim() ? `-${draft.end.trim()}` : ''} | ${stageName} | ${artist}`;
    const parsed = parseLineupImport(line).slots[0];
    if (!parsed) { alert('時間格式不正確，請用 HH:MM，過午夜可寫 24:30'); return; }
    if (draft.id) {
      onChange(lineup.map(s => (s.id === draft.id ? { ...parsed, id: s.id, starred: s.starred } : s)));
    } else {
      onChange([...lineup, { ...parsed, id: generateId() }]);
    }
    setDraft(null);
  };

  const removeSlot = (slot: LineupSlot) => {
    if (confirm(`刪除「${slot.artist}」？`)) onChange(lineup.filter(s => s.id !== slot.id));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">節目表</h2>
            <p className="text-[11px] text-gray-400 truncate">{show.title} · {show.date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>

        <div className="px-4 py-2 border-b space-y-2">
          <div className="flex gap-1">
            {(['mine', 'all'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 text-xs py-1.5 rounded-full border transition-colors ${
                  tab === t ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-gray-200 text-gray-400'
                }`}>
                {t === 'mine' ? `我的行程 (${starredCount})` : `全部 (${lineup.length})`}
              </button>
            ))}
          </div>
          {tab === 'all' && stages.length > 1 && (
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {[null, ...stages].map(st => (
                <button key={st ?? '__all'} onClick={() => setStage(st)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${
                    stage === st ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500'
                  }`}>
                  {st ?? '全部舞台'}
                </button>
              ))}
            </div>
          )}
          {isAuthorized && (
            <div className="flex gap-2">
              <button onClick={() => setImportOpen(!importOpen)}
                className="text-xs text-purple-500 border border-purple-300 rounded-full px-2.5 py-1">
                {importOpen ? '收起匯入' : '貼上匯入'}
              </button>
              <button onClick={() => setDraft({ ...emptyDraft, stage: stage ?? '' })}
                className="text-xs text-blue-500 border border-blue-300 rounded-full px-2.5 py-1">+ 新增一組</button>
              {lineup.length > 0 && (
                <button onClick={() => { if (confirm('清空整個節目表？')) onChange([]); }}
                  className="text-xs text-red-400 border border-red-300 rounded-full px-2.5 py-1 ml-auto">清空</button>
              )}
            </div>
          )}
          {importOpen && isAuthorized && (
            <div className="space-y-1.5">
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={5}
                placeholder={'一行一組，例如：\n13:00-13:40 | MAIN STAGE | 藝人A\n24:10-25:00 | B舞台 | 藝人B'}
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono" />
              <div className="flex gap-2">
                <button onClick={copyPrompt}
                  className="text-xs text-gray-600 border border-gray-300 rounded-full px-2.5 py-1">
                  {promptCopied ? '已複製' : '複製提示詞'}
                </button>
                <button onClick={runImport} disabled={!importText.trim()}
                  className="text-xs text-white bg-purple-500 rounded-full px-3 py-1 disabled:bg-gray-300">解析</button>
              </div>
              {importErrors > 0 && (
                <p className="text-[10px] text-red-500">{importErrors} 行無法解析，已留在框內，修正後可再按解析</p>
              )}
            </div>
          )}
          {draft && (
            <div className="border rounded-lg p-2 space-y-1.5 bg-gray-50">
              <div className="flex gap-1.5 items-center">
                <input value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })}
                  placeholder="開始 13:00" className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-xs" />
                <span className="text-xs text-gray-400">-</span>
                <input value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })}
                  placeholder="結束 (選填)" className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-xs" />
              </div>
              <input value={draft.stage} onChange={e => setDraft({ ...draft, stage: e.target.value })}
                list="lineup-stages" placeholder="舞台" className="w-full border rounded-lg px-2 py-1.5 text-xs" />
              <datalist id="lineup-stages">
                {stages.map(st => <option key={st} value={st} />)}
              </datalist>
              <input value={draft.artist} onChange={e => setDraft({ ...draft, artist: e.target.value })}
                placeholder="藝人" className="w-full border rounded-lg px-2 py-1.5 text-xs" />
              <div className="flex gap-2">
                <button onClick={saveDraft} className="text-xs text-white bg-purple-500 rounded-full px-3 py-1">
                  {draft.id ? '儲存' : '新增'}
                </button>
                <button onClick={() => setDraft(null)} className="text-xs text-gray-500 border rounded-full px-3 py-1">取消</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
          {visible.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              {tab === 'mine' ? (lineup.length ? '還沒有打星號的演出' : '還沒有節目表') : '還沒有節目表'}
            </p>
          ) : (
            visible.map((slot, i) => {
              const prev = tab === 'mine' && i > 0 ? visible[i - 1] : null;
              const gap = prev?.end ? timeToMinutes(slot.start) - timeToMinutes(prev.end) : null;
              const conflict = tab === 'mine' && conflicts.has(slot.id);
              return (
                <div key={slot.id}>
                  {gap !== null && gap > 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-0.5">空 {gap} 分</p>
                  )}
                  <div className={`flex items-center gap-2 py-2 border-b border-gray-50 ${conflict ? 'bg-red-50 -mx-2 px-2 rounded' : ''}`}>
                    <button onClick={() => toggleStar(slot.id)} disabled={!isAuthorized}
                      aria-label={slot.starred ? '取消星號' : '加星號'}
                      className={`text-lg leading-none flex-shrink-0 ${slot.starred ? 'text-amber-400' : 'text-gray-300'}`}>
                      {slot.starred ? '★' : '☆'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{slot.artist}</p>
                      <p className="text-[11px] text-gray-500">
                        {timeRange(slot)}
                        {(tab === 'mine' || !stage) && <span className="text-gray-400"> · {slot.stage}</span>}
                        {conflict && <span className="text-red-500"> · 撞場</span>}
                      </p>
                    </div>
                    {isAuthorized && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setDraft({ id: slot.id, start: slot.start, end: slot.end ?? '', stage: slot.stage, artist: slot.artist })}
                          className="text-[11px] text-purple-500 px-1">編輯</button>
                        <button onClick={() => removeSlot(slot)} className="text-[11px] text-red-400 px-1">刪除</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
