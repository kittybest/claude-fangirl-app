import { useState } from 'react';
import { Show, Schedule, Series, Run } from './types';
import { useAppData } from './hooks/useAppData';
import { useAuth } from './hooks/useAuth';
import BottomNav from './components/layout/BottomNav';
import LoginModal from './components/layout/LoginModal';
import CalendarView from './components/calendar/CalendarView';
import ListView from './components/series/ListView';
import { ShowFilters } from './components/series/ShowList';
import ExpenseList from './components/expenses/ExpenseList';
import StatsView from './components/stats/StatsView';
import SettingsView from './components/settings/SettingsView';
import ShowForm from './components/shows/ShowForm';
import ScheduleForm from './components/schedules/ScheduleForm';
import SeriesForm from './components/series/SeriesForm';
import RunForm from './components/series/RunForm';
import { buildVenueIndex, displayVenue } from './utils/venues';

type Tab = 'calendar' | 'lists' | 'expenses' | 'stats' | 'settings';

export default function App() {
  const {
    data,
    addShow, updateShow, removeShow,
    addSchedule, updateSchedule, removeSchedule,
    addExpense, updateExpense, removeExpense,
    addSeries, updateSeries, removeSeries,
    addRun, updateRun, removeRun,
    addArtist, updateArtist, mergeArtists, removeArtist,
    updateVenue, mergeVenues, removeVenue,
  } = useAppData();
  const { isAuthorized, login, logout } = useAuth();

  const [tab, setTab] = useState<Tab>('calendar');
  const [showForm, setShowForm] = useState(false);
  const [showFormDate, setShowFormDate] = useState<string | undefined>();
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [duplicatingShow, setDuplicatingShow] = useState<Show | null>(null);
  const [scheduleForm, setScheduleForm] = useState(false);
  const [scheduleFormDate, setScheduleFormDate] = useState<string | undefined>();
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [duplicatingSchedule, setDuplicatingSchedule] = useState<Schedule | null>(null);
  const [seriesForm, setSeriesForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [runForm, setRunForm] = useState(false);
  const [editingRun, setEditingRun] = useState<Run | null>(null);
  const [showFromRun, setShowFromRun] = useState<Show | null>(null);
  const [expandSeriesId, setExpandSeriesId] = useState<string | null>(null);
  const [listFilters, setListFilters] = useState<Partial<ShowFilters> | null>(null);
  const [loginModal, setLoginModal] = useState(false);

  const handleGoToSeries = (seriesId: string) => {
    setExpandSeriesId(seriesId);
    setTab('lists');
  };

  // Prefill a new show from the run; id '' marks it as new, not a duplicate
  const handleAddShowFromRun = (run: Run) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const venue = displayVenue(buildVenueIndex(data.venues || []), run);
    setShowFromRun({
      id: '',
      title: run.title,
      date: run.startDate && run.startDate > todayStr ? run.startDate : todayStr,
      timezone: run.timezone,
      artists: [],
      venue: venue?.name,
      venueId: run.venueId,
      category: 'musical',
      links: run.infoUrl ? [{ label: '官方資訊', url: run.infoUrl }] : [],
      status: 'interested',
      runId: run.id,
    });
  };

  const handleOpenShowList = (filters: Partial<ShowFilters>) => {
    setExpandSeriesId(null);
    setListFilters(filters);
    setTab('lists');
  };

  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen flex flex-col pb-14">
      {tab === 'calendar' && (
        <CalendarView
          shows={data.shows}
          schedules={data.schedules}
          allSeries={data.series || []}
          allArtists={data.artists || []}
          allVenues={data.venues || []}
          isAuthorized={isAuthorized}
          onAddShow={(d) => { setShowFormDate(d); setShowForm(true); }}
          onAddSchedule={(d) => { setScheduleFormDate(d); setScheduleForm(true); }}
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
          runs={data.runs || []}
          allArtists={data.artists || []}
          allVenues={data.venues || []}
          isAuthorized={isAuthorized}
          onEditSeries={sr => setEditingSeries(sr)}
          onDeleteSeries={removeSeries}
          onAddRun={() => setRunForm(true)}
          onEditRun={run => setEditingRun(run)}
          onDeleteRun={removeRun}
          onAddShowFromRun={handleAddShowFromRun}
          expandSeriesId={expandSeriesId}
          initialShowFilters={listFilters}
        />
      )}
      {tab === 'expenses' && isAuthorized && (
        <ExpenseList
          expenses={data.expenses}
          shows={data.shows}
          allArtists={data.artists || []}
          isAuthorized={isAuthorized}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onDelete={id => { if (confirm('刪除此花費？')) removeExpense(id); }}
        />
      )}
      {tab === 'stats' && isAuthorized && (
        <StatsView
          shows={data.shows}
          expenses={data.expenses}
          artists={data.artists || []}
          venues={data.venues || []}
          onOpenShowList={handleOpenShowList}
        />
      )}
      {tab === 'settings' && (
        <SettingsView
          data={data}
          isAuthorized={isAuthorized}
          onLoginClick={() => setLoginModal(true)}
          onLogout={logout}
          onCreateArtist={addArtist}
          onUpdateArtist={updateArtist}
          onMergeArtists={mergeArtists}
          onRemoveArtist={removeArtist}
          onUpdateVenue={updateVenue}
          onMergeVenues={mergeVenues}
          onRemoveVenue={removeVenue}
        />
      )}

      {/* Series Form (new or edit) */}
      {(seriesForm || editingSeries) && (
        <SeriesForm
          initial={editingSeries ? {
            series: editingSeries,
            shows: data.shows.filter(s => editingSeries.showIds.includes(s.id)),
          } : undefined}
          allArtists={data.artists || []}
          allVenues={data.venues || []}
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
        onChange={t => { setTab(t); setListFilters(null); if (t !== 'lists') setExpandSeriesId(null); }}
        isAuthorized={isAuthorized}
      />

      {loginModal && (
        <LoginModal onLogin={login} onClose={() => setLoginModal(false)} />
      )}

      {/* Run Form (new or edit) */}
      {(runForm || editingRun) && (
        <RunForm
          initial={editingRun ?? undefined}
          allVenues={data.venues || []}
          onSave={run => {
            if (editingRun) updateRun(editingRun.id, run);
            else addRun(run);
            setRunForm(false);
            setEditingRun(null);
          }}
          onClose={() => { setRunForm(false); setEditingRun(null); }}
        />
      )}

      {/* Show Form */}
      {(showForm || editingShow || duplicatingShow || showFromRun) && (
        <ShowForm
          initial={editingShow ?? duplicatingShow ?? showFromRun ?? undefined}
          isEdit={!!editingShow}
          defaultDate={showFormDate}
          allSeries={data.series || []}
          allArtists={data.artists || []}
          allVenues={data.venues || []}
          onSave={show => {
            if (editingShow) updateShow(editingShow.id, show);
            else addShow(show);
            setShowForm(false);
            setEditingShow(null);
            setDuplicatingShow(null);
            setShowFromRun(null);
          }}
          onClose={() => { setShowForm(false); setEditingShow(null); setDuplicatingShow(null); setShowFromRun(null); }}
        />
      )}

      {/* Schedule Form */}
      {(scheduleForm || editingSchedule || duplicatingSchedule) && (
        <ScheduleForm
          initial={editingSchedule ?? duplicatingSchedule ?? undefined}
          isEdit={!!editingSchedule}
          defaultDate={scheduleFormDate}
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
