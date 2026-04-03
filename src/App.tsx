import { useState } from 'react';
import { Show, Schedule } from './types';
import { useAppData } from './hooks/useAppData';
import BottomNav from './components/layout/BottomNav';
import CalendarView from './components/calendar/CalendarView';
import ExpenseList from './components/expenses/ExpenseList';
import StatsView from './components/stats/StatsView';
import ShowForm from './components/shows/ShowForm';
import ScheduleForm from './components/schedules/ScheduleForm';

type Tab = 'calendar' | 'expenses' | 'stats';

export default function App() {
  const {
    data,
    addShow, updateShow, removeShow,
    addSchedule, updateSchedule, removeSchedule,
    addExpense, updateExpense, removeExpense,
  } = useAppData();

  const [tab, setTab] = useState<Tab>('calendar');
  const [showForm, setShowForm] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [scheduleForm, setScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [duplicatingSchedule, setDuplicatingSchedule] = useState<Schedule | null>(null);

  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen flex flex-col pb-14">
      {tab === 'calendar' && (
        <CalendarView
          shows={data.shows}
          schedules={data.schedules}
          onAddShow={() => setShowForm(true)}
          onAddSchedule={() => setScheduleForm(true)}
          onEditShow={s => setEditingShow(s)}
          onEditSchedule={s => setEditingSchedule(s)}
          onDuplicateSchedule={s => setDuplicatingSchedule(s)}
          onDeleteShow={id => { if (confirm('刪除此演出？')) removeShow(id); }}
          onDeleteSchedule={id => { if (confirm('刪除此時程？')) removeSchedule(id); }}
        />
      )}
      {tab === 'expenses' && (
        <ExpenseList
          expenses={data.expenses}
          shows={data.shows}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onDelete={id => { if (confirm('刪除此花費？')) removeExpense(id); }}
        />
      )}
      {tab === 'stats' && (
        <StatsView shows={data.shows} expenses={data.expenses} />
      )}

      <BottomNav active={tab} onChange={setTab} />

      {/* Show Form */}
      {(showForm || editingShow) && (
        <ShowForm
          initial={editingShow ?? undefined}
          onSave={show => {
            if (editingShow) updateShow(editingShow.id, show);
            else addShow(show);
            setShowForm(false);
            setEditingShow(null);
          }}
          onClose={() => { setShowForm(false); setEditingShow(null); }}
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
            else addSchedule(schedule); // both new and duplicate create a new entry
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
