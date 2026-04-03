import { useState } from 'react';
import { Show, Schedule } from '../../types';
import { getDaysInMonth, getFirstDayOfWeek, formatDate, parseDate } from '../../utils/date';
import { STATUS_CONFIG } from '../../utils/constants';
import DayDetail from './DayDetail';

interface Props {
  shows: Show[];
  schedules: Schedule[];
  isAuthorized: boolean;
  onAddShow: () => void;
  onAddSchedule: () => void;
  onAddSeries: () => void;
  onEditShow: (show: Show) => void;
  onDuplicateShow: (show: Show) => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDuplicateSchedule: (schedule: Schedule) => void;
  onDeleteShow: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
}

export default function CalendarView({ shows, schedules, isAuthorized, onAddShow, onAddSchedule, onAddSeries, onEditShow, onDuplicateShow, onEditSchedule, onDuplicateSchedule, onDeleteShow, onDeleteSchedule }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  const navigateToDate = (dateStr: string) => {
    const { year: y, month: m } = parseDate(dateStr);
    setYear(y);
    setMonth(m);
    setSelectedDate(dateStr);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelectedDate(null); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelectedDate(null); };

  // Get shows for a date (exclude cancelled)
  const showsForDate = (dateStr: string) => shows.filter(s => s.date === dateStr && s.status !== 'cancelled');

  // Convert schedule datetime+timezone to local date
  const schedulesForDate = (dateStr: string) => schedules.filter(s => {
    try {
      const utc = new Date(s.datetime);
      const local = new Date(utc.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
      const localDate = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
      return localDate === dateStr;
    } catch { return false; }
  });

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <button onClick={prev} className="p-2 text-gray-500 text-lg">&lt;</button>
        <h2 className="text-base font-bold text-gray-800">{year} 年 {month + 1} 月</h2>
        <button onClick={next} className="p-2 text-gray-500 text-lg">&gt;</button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-white border-b">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 bg-white flex-shrink-0">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="border-b border-r border-gray-100 h-14" />;
          const dateStr = formatDate(year, month, day);
          const dayShows = showsForDate(dateStr);
          const daySchedules = schedulesForDate(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasItems = dayShows.length > 0 || daySchedules.length > 0;

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`border-b border-r border-gray-100 h-14 p-0.5 text-left flex flex-col transition-colors ${
                isSelected ? 'bg-purple-50' : ''
              }`}
            >
              <span className={`text-[11px] leading-none ${
                isToday ? 'bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-gray-600 px-0.5'
              }`}>
                {day}
              </span>
              {hasItems && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayShows.map(s => (
                    <span key={s.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s.status].dot}`} />
                  ))}
                  {daySchedules.map(s => (
                    <span key={s.id} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail / event list */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selectedDate ? (
          <DayDetail
            date={selectedDate}
            shows={showsForDate(selectedDate)}
            schedules={schedulesForDate(selectedDate)}
            allShows={shows}
            isAuthorized={isAuthorized}
            onNavigateToDate={navigateToDate}
            onAddShow={onAddShow}
            onAddSchedule={onAddSchedule}
            onEditShow={onEditShow}
            onDuplicateShow={onDuplicateShow}
            onEditSchedule={onEditSchedule}
            onDuplicateSchedule={onDuplicateSchedule}
            onDeleteShow={onDeleteShow}
            onDeleteSchedule={onDeleteSchedule}
          />
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            點選日期查看詳情
          </div>
        )}
      </div>

      {/* FAB */}
      {isAuthorized && (
        <>
          {fabOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />
          )}
          <div className="fixed bottom-16 right-4 flex flex-col items-end gap-2 z-40">
            {fabOpen && (
              <>
                <button onClick={() => { onAddSeries(); setFabOpen(false); }}
                  className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-3 pr-4 py-2 text-sm text-gray-700 border">
                  <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">📋</span>
                  新增系列
                </button>
                <button onClick={() => { onAddSchedule(); setFabOpen(false); }}
                  className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-3 pr-4 py-2 text-sm text-gray-700 border">
                  <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">⏰</span>
                  新增時程
                </button>
                <button onClick={() => { onAddShow(); setFabOpen(false); }}
                  className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-3 pr-4 py-2 text-sm text-gray-700 border">
                  <span className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">🎵</span>
                  新增演出
                </button>
              </>
            )}
            <button onClick={() => setFabOpen(!fabOpen)}
              className={`w-12 h-12 rounded-full shadow-lg text-white text-xl flex items-center justify-center transition-transform ${
                fabOpen ? 'bg-gray-500 rotate-45' : 'bg-purple-500'
              }`}>
              +
            </button>
          </div>
        </>
      )}
    </div>
  );
}
