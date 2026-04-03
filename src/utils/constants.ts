import { ShowCategory, ScheduleType, ExpenseCategory } from '../types';

export const SHOW_CATEGORIES: { value: ShowCategory; label: string }[] = [
  { value: 'concert', label: '演唱會' },
  { value: 'musical', label: '音樂劇' },
  { value: 'play', label: '戲劇' },
  { value: 'movie', label: '電影' },
  { value: 'online', label: '線上演出' },
  { value: 'festival', label: '音樂節' },
  { value: 'other', label: '其他' },
];

export const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'member', label: '會員搶票' },
  { value: 'presale', label: '預售搶票' },
  { value: 'general', label: '一般售票' },
  { value: 'lottery', label: '抽票' },
  { value: 'other', label: '其他' },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '門票', '周邊', '專輯', '會員', '生咖', '展覽', '電影/線上演出', '預錄', '泡泡', '其他',
];

export const TIMEZONES = [
  { value: 'Asia/Taipei', label: '台灣 (UTC+8)' },
  { value: 'Asia/Seoul', label: '韓國 (UTC+9)' },
  { value: 'Asia/Tokyo', label: '日本 (UTC+9)' },
  { value: 'Asia/Shanghai', label: '中國 (UTC+8)' },
  { value: 'America/Los_Angeles', label: '美西 (UTC-7)' },
  { value: 'America/New_York', label: '美東 (UTC-4)' },
  { value: 'Europe/London', label: '倫敦 (UTC+1)' },
];

export const STATUS_CONFIG = {
  interested: { label: '有興趣', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  ticketed: { label: '已購票', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
};
