import { useState } from 'react';

interface Props {
  onLogin: (password: string) => Promise<boolean>;
  onClose: () => void;
}

export default function LoginModal({ onLogin, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await onLogin(password);
    setLoading(false);
    if (ok) onClose();
    else { setError(true); setPassword(''); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-72 shadow-xl">
        <h2 className="text-base font-bold text-gray-800 mb-3">🔒 輸入密碼</h2>
        <input
          type="password" value={password}
          onChange={e => { setPassword(e.target.value); setError(false); }}
          placeholder="密碼"
          className={`w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
          autoFocus
        />
        {error && <p className="text-xs text-red-500 mb-2">密碼錯誤</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading}
            className="flex-1 bg-purple-500 text-white rounded-full py-2 text-sm disabled:opacity-50">
            {loading ? '驗證中...' : '解鎖'}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-600 rounded-full py-2 text-sm">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
