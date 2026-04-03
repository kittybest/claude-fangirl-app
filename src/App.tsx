import { useState } from 'react';
import { Show, Schedule, Series } from './types';
import { useAppData } from './hooks/useAppData';
import { useAuth } from './hooks/useAuth';
import BottomNav from './components/layout/BottomNav';
import LoginModal from './components/layout/LoginModal';
import CalendarView from './components/calendar/CalendarView';
import ListView from './components/series/ListView';
import ExpenseList from './components/expenses/ExpenseList';
import StatsView from './components/stats/StatsView';
import ShowForm from './components/shows/ShowForm';
import ScheduleForm from './components/schedules/ScheduleForm';
import SeriesForm from './components/series/SeriesForm';

type Tab = 'calendar' | 'lists' | 'expenses' | 'stats';

export default function App() {
  const {
    data,
    addShow, updateShow, removeShow,
    addSchedule, updateSchedule, removeSchedule,
    addExpense, updateExpense, removeExpense,
    addSeries, updateSeries, removeSeries,
  } = useAppData();
  const { isAuthorized, login, logout } = useAuth();

  const [tab, setTab] = useState<Tab>('calendar');
  const [showForm, setShowForm] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [duplicatingShow, setDuplicatingShow] = useState<Show | null>(null);
  const [scheduleForm, setScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [duplicatingSchedule, setDuplicatingSchedule] = useState<Schedule | null>(null);
  const [seriesForm, setSeriesForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [expandSeriesId, setExpandSeriesId] = useState<string | null>(null);
  const [loginModal, setLoginModal] = useState(false);

  const handleGoToSeries = (seriesId: string) => {
    setExpandSeriesId(seriesId);
    setTab('lists');
  };

  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen flex flex-col pb-14">
      {tab === 'calendar' && (
        <CalendarView
          shows={data.shows}
          schedules={data.schedules}
          allSeries={data.series || []}
          isAuthorized={isAuthorized}
          onAddShow={() => setShowForm(true)}
          onAddSchedule={() => setScheduleForm(true)}
          onAddSeries={() => setSeriesForm(true)}
          onEditShow={s => setEditingShow(s)}
          onDuplicateShow={s => setDuplicatingShow(s)}
          onEditSchedule={s => setEditingSchedule(s)}
          onDuplicateSchedule={s => setDuplicatingSchedule(s)}
          onDeleteShow={id => { if (confirm('刪除此演出？')) removeShow(id); }}
          onDeleteSchedule={id => { if (confirm('刪除此時程？')) removeSchedule(id); }}
          onGoToSeries={handleGoToSeries}
        />
      )}
      {tab === 'lists' && (
        <ListView
          shows={data.shows}
          series={data.series || []}
          isAuthorized={isAuthorized}
          onEditSeries={sr => setEditingSeries(sr)}
          onDeleteSeries={removeSeries}
          expandSeriesId={expandSeriesId}
        />
      )}
      {tab === 'expenses' && isAuthorized && (
        <ExpenseList
          expenses={data.expenses}
          shows={data.shows}
          isAuthorized={isAuthorized}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onDelete={id => { if (confirm('刪除此花費？')) removeExpense(id); }}
        />
      )}
      {tab === 'stats' && isAuthorized && (
        <StatsView shows={data.shows} expenses={data.expenses} />
      )}

      {/* Series Form (new or edit) */}
      {(seriesForm || editingSeries) && (
        <SeriesForm
          initial={editingSeries ? {
            series: editingSeries,
            shows: data.shows.filter(s => editingSeries.showIds.includes(s.id)),
          } : undefined}
          onSave={(title, artists, items) => {
            if (editingSeries) {
              updateSeries(editingSeries.id, title, artists, items);
            } else {
              addSeries(title, artists, items);
            }
            setSeriesForm(false);
            setEditingSeries(null);
          }}
          onClose={() => { setSeriesForm(false); setEditingSeries(null); }}
        />
      )}

      {(tab === 'expenses' || tab === 'stats') && !isAuthorized && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">請先登入查看</p>
        </div>
      )}

      <BottomNav
        active={tab}
        onChange={t => { setTab(t); if (t !== 'lists') setExpandSeriesId(null); }}
        isAuthorized={isAuthorized}
        onAuthClick={() => isAuthorized ? logout() : setLoginModal(true)}
      />

      {loginModal && (
        <LoginModal onLogin={login} onClose={() => setLoginModal(false)} />
      )}

      {/* Show Form */}
      {(showForm || editingShow || duplicatingShow) && (
        <ShowForm
          initial={editingShow ?? duplicatingShow ?? undefined}
          isEdit={!!editingShow}
          onSave={show => {
            if (editingShow) updateShow(editingShow.id, show);
            else addShow(show);
            setShowForm(false);
            setEditingShow(null);
            setDuplicatingShow(null);
          }}
          onClose={() => { setShowForm(false); setEditingShow(null); setDuplicatingShow(null); }}
        />
      )}

      {/* Schedule Form */}
      {(scheduleForm || editingSchedule || duplicatingSchedule) && (
        <ScheduleForm
          initial={editingSchedule ?? duplicatingSchedule ?? undefined}
          isEdit={!!editingSchedule}
          shows={data.shows}
          onSave={schedule => {
            if (editingSchedule) updateSchedule(editingSchedule.id, schedule);
            else addSchedule(schedule);
            setScheduleForm(false);
            setEditingSchedule(null);
            setDuplicatingSchedule(null);
          }}
          onClose={() => { setScheduleForm(false); setEditingSchedule(null); setDuplicatingSchedule(null); }}
        />
      )}
    </div>
  );
}
