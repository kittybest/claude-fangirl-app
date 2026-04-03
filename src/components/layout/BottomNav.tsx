type Tab = 'calendar' | 'expenses' | 'stats';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'calendar', label: '月曆', icon: '📅' },
  { key: 'expenses', label: '記帳', icon: '💰' },
  { key: 'stats', label: '統計', icon: '📊' },
];

export default function BottomNav({ active, onChange }: Props) {
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
    </nav>
  );
}
