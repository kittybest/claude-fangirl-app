export type ShowStatus = 'interested' | 'ticketed' | 'cancelled';
export type ShowCategory = 'concert' | 'musical' | 'play' | 'movie' | 'online' | 'festival' | 'fansign' | 'prerecording' | 'exhibition' | 'other';
export type ScheduleType = 'member' | 'presale' | 'general' | 'lottery' | 'other';
export type ExpenseCategory = '門票' | '周邊' | '專輯' | '會員' | '生咖' | '簽售' | '展覽' | '電影/線上演出' | '預錄' | '泡泡' | '其他';
export type Currency = 'TWD' | 'JPY' | 'KRW' | 'CNY' | 'USD';

export interface ShowLink {
  label: string;
  url: string;
}

export interface Artist {
  id: string;
  name: string;
  aliases: string[];
  /** Groups this artist rolls up into. One level only: a member's shows count
   *  toward the group, but the group's shows never count toward the member. */
  groupIds?: string[];
  /** false/undefined = auto-created from input, not tidied up yet */
  reviewed?: boolean;
}

export interface Venue {
  id: string;
  name: string;
  aliases: string[];
  city?: string;
  /** Belongs to the place, not to any single show. */
  url?: string;
  /** false/undefined = auto-created from input, not tidied up yet */
  reviewed?: boolean;
}

export interface Show {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  timezone?: string;
  /** Raw text as typed. Kept as the input/display source; artistIds is what stats use. */
  artists: string[];
  artistIds?: string[];
  /** Raw text as typed. Kept as the input source; venueId is what lookups use. */
  venue?: string;
  venueId?: string;
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
  artistIds?: string[];
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
  artists: Artist[];
  venues: Venue[];
}
