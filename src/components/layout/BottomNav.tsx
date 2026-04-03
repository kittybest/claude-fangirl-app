type Tab = 'calendar' | 'lists' | 'expenses' | 'stats';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  isAuthorized: boolean;
  onAuthClick: () => void;
}

const tabs: { key: Tab; label: string; icon: string; authOnly?: boolean }[] = [
  { key: 'calendar', label: '月曆', icon: '📅' },
  { key: 'lists', label: '列表', icon: '📋' },
  { key: 'expenses', label: '記帳', icon: '💰', authOnly: true },
  { key: 'stats', label: '統計', icon: '📊', authOnly: true },
];

export default function BottomNav({ active, onChange, isAuthorized, onAuthClick }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-xs transition-colors ${
            active === t.key ? 'text-purple-600' : 'text-gray-400'
          }`}
        >
          <span className="text-lg">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
      <button
        onClick={onAuthClick}
        className={`w-14 py-2 flex flex-col items-center gap-0.5 text-xs transition-colors ${
          isAuthorized ? 'text-green-500' : 'text-gray-400'
        }`}
      >
        <span className="text-lg">{isAuthorized ? '🔓' : '🔒'}</span>
        <span>{isAuthorized ? '已登入' : '登入'}</span>
      </button>
    </nav>
  );
}
