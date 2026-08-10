import { useState } from 'react';
import { AppData, Artist } from '../../types';
import ArtistManager from './ArtistManager';

interface Props {
  data: AppData;
  isAuthorized: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onUpdateArtist: (id: string, updates: Partial<Omit<Artist, 'id'>>) => void;
  onMergeArtists: (fromId: string, intoId: string) => void;
  onRemoveArtist: (id: string) => void;
}

function download(content: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SettingsView({
  data, isAuthorized, onLoginClick, onLogout,
  onUpdateArtist, onMergeArtists, onRemoveArtist,
}: Props) {
  const [managingArtists, setManagingArtists] = useState(false);

  const today = new Date().toLocaleDateString('sv-SE');
  const unreviewed = data.artists.filter(a => !a.reviewed).length;

  const downloadBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        alert(res.status === 404 ? '還沒有備份快照' : '讀取備份失敗');
        return;
      }
      download(await res.json(), 'fangirl-backup-pre-artists.json');
    } catch {
      alert('讀取備份失敗');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-white border-b px-4 py-3">
        <h2 className="text-base font-bold">設定</h2>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
          <span className="text-xl">{isAuthorized ? '🔓' : '🔒'}</span>
          <div className="flex-1">
            <p className="text-sm text-gray-800">{isAuthorized ? '已登入' : '未登入'}</p>
            <p className="text-[10px] text-gray-400">
              {isAuthorized ? '可以編輯資料與管理藝人' : '登入後才能記帳、看統計與管理藝人'}
            </p>
          </div>
          {isAuthorized ? (
            <button onClick={onLogout}
              className="text-xs text-gray-500 border border-gray-300 rounded-full px-3 py-1.5">登出</button>
          ) : (
            <button onClick={onLoginClick}
              className="text-xs bg-purple-500 text-white rounded-full px-4 py-1.5">登入</button>
          )}
        </div>

        {isAuthorized && (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => setManagingArtists(true)}
                className="w-full px-4 py-3 flex items-center gap-2 text-left">
                <div className="flex-1">
                  <p className="text-sm text-gray-800">藝人管理</p>
                  <p className="text-[10px] text-gray-400">合併重複、設定別名與所屬團體</p>
                </div>
                {unreviewed > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {unreviewed} 待整理
                  </span>
                )}
                <span className="text-gray-300">›</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y">
              <button onClick={() => download(data, `fangirl-data-${today}.json`)}
                className="w-full px-4 py-3 text-left">
                <p className="text-sm text-gray-800">匯出目前資料</p>
                <p className="text-[10px] text-gray-400">下載完整 JSON 備份</p>
              </button>
              <button onClick={downloadBackup} className="w-full px-4 py-3 text-left">
                <p className="text-sm text-gray-800">下載遷移前備份</p>
                <p className="text-[10px] text-gray-400">藝人標籤化之前的原始快照</p>
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center">
              演出 {data.shows.length} · 花費 {data.expenses.length} · 系列 {data.series.length} · 藝人 {data.artists.length}
            </p>
          </>
        )}
      </div>

      {managingArtists && (
        <ArtistManager
          data={data}
          onUpdate={onUpdateArtist}
          onMerge={onMergeArtists}
          onRemove={onRemoveArtist}
          onClose={() => setManagingArtists(false)}
        />
      )}
    </div>
  );
}
