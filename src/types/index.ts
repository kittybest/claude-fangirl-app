export type ShowStatus = 'interested' | 'ticketed' | 'cancelled';
export type ShowCategory = 'concert' | 'musical' | 'play' | 'movie' | 'online' | 'festival' | 'fansign' | 'prerecording' | 'exhibition' | 'other';
export type ScheduleType = 'member' | 'presale' | 'general' | 'lottery' | 'other';
export type ExpenseCategory = '門票' | '周邊' | '專輯' | '會員' | '生咖' | '簽售' | '展覽' | '電影/線上演出' | '預錄' | '泡泡' | '其他';
export type Currency = 'TWD' | 'JPY' | 'KRW' | 'CNY' | 'USD';

export interface ShowLink {
  label: string;
  url: string;
}

export interface Show {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  timezone?: string;
  artists: string[];
  venue?: string;
  venueUrl?: string;
  seat?: string;
  category?: ShowCategory;
  links: ShowLink[];
  seriesId?: string;
  ticketPrice?: number;
  ticketCurrency?: Currency;
  ticketPriceTWD?: number;
  status: ShowStatus;
  resalePrice?: number;
  resaleCurrency?: Currency;
  resalePriceTWD?: number;
  rating?: number;
  notes?: string;
}

export interface Schedule {
  id: string;
  title: string;
  datetime: string; // ISO string in original timezone
  timezone: string; // e.g. 'Asia/Taipei'
  type: ScheduleType;
  ticketUrl?: string;
  relatedShowId?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  artists: string[];
  amount: number;
  currency: Currency;
  amountTWD: number;
  notes?: string;
}

export interface Series {
  id: string;
  title: string;
  showIds: string[];
}

export interface AppData {
  shows: Show[];
  schedules: Schedule[];
  expenses: Expense[];
  series: Series[];
}
