import { useState, useCallback, useEffect, useRef } from 'react';
import { AppData, Show, Schedule, Expense, Series } from '../types';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'fangirl-app-data';

const empty: AppData = { shows: [], schedules: [], expenses: [], series: [] };

function getLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : empty;
  } catch {
    return empty;
  }
}

async function fetchRemote(): Promise<AppData> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const data = await res.json();
      if (data.shows?.length > 0 || data.schedules?.length > 0 || data.expenses?.length > 0) {
        return data;
      }
      // Remote empty — check local for migration
      const local = getLocal();
      if (local.shows.length > 0 || local.schedules.length > 0 || local.expenses.length > 0) {
        await saveRemote(local);
        return local;
      }
      return empty;
    }
  } catch {}
  return getLocal();
}

async function saveRemote(data: AppData): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  try {
    await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}

export function useAppData() {
  const [data, setDataState] = useState<AppData>(getLocal);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchRemote().then(d => { setDataState(d); setLoaded(true); });
  }, []);

  const setData = useCallback((updater: (prev: AppData) => AppData) => {
    setDataState(prev => {
      const next = updater(prev);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => saveRemote(next), 300);
      return next;
    });
  }, []);

  // Shows
  const addShow = useCallback((show: Omit<Show, 'id'>) => {
    setData(d => ({ ...d, shows: [...d.shows, { ...show, id: generateId() }] }));
  }, [setData]);

  const updateShow = useCallback((id: string, updates: Partial<Omit<Show, 'id'>>) => {
    setData(d => ({ ...d, shows: d.shows.map(s => s.id === id ? { ...s, ...updates } : s) }));
  }, [setData]);

  const removeShow = useCallback((id: string) => {
    setData(d => ({
      ...d,
      shows: d.shows.filter(s => s.id !== id),
      schedules: d.schedules.filter(s => s.relatedShowId !== id),
    }));
  }, [setData]);

  // Schedules
  const addSchedule = useCallback((schedule: Omit<Schedule, 'id'>) => {
    setData(d => ({ ...d, schedules: [...d.schedules, { ...schedule, id: generateId() }] }));
  }, [setData]);

  const updateSchedule = useCallback((id: string, updates: Partial<Omit<Schedule, 'id'>>) => {
    setData(d => ({ ...d, schedules: d.schedules.map(s => s.id === id ? { ...s, ...updates } : s) }));
  }, [setData]);

  const removeSchedule = useCallback((id: string) => {
    setData(d => ({ ...d, schedules: d.schedules.filter(s => s.id !== id) }));
  }, [setData]);

  // Expenses
  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    setData(d => ({ ...d, expenses: [...d.expenses, { ...expense, id: generateId() }] }));
  }, [setData]);

  const updateExpense = useCallback((id: string, updates: Partial<Omit<Expense, 'id'>>) => {
    setData(d => ({ ...d, expenses: d.expenses.map(e => e.id === id ? { ...e, ...updates } : e) }));
  }, [setData]);

  const removeExpense = useCallback((id: string) => {
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  }, [setData]);

  // Series — batch create shows
  const addSeries = useCallback((title: string, artists: string[], items: { date: string; venue: string }[]) => {
    const seriesId = generateId();
    const newShows: Show[] = items.map(item => ({
      id: generateId(),
      title,
      date: item.date,
      venue: item.venue || undefined,
      artists,
      links: [],
      status: 'interested' as const,
    }));
    const series: Series = {
      id: seriesId,
      title,
      showIds: newShows.map(s => s.id),
    };
    setData(d => ({
      ...d,
      shows: [...d.shows, ...newShows],
      series: [...(d.series || []), series],
    }));
  }, [setData]);

  const removeSeries = useCallback((id: string) => {
    setData(d => {
      const series = (d.series || []).find(s => s.id === id);
      if (!series) return d;
      return {
        ...d,
        shows: d.shows.filter(s => !series.showIds.includes(s.id)),
        schedules: d.schedules.filter(s => !s.relatedShowId || !series.showIds.includes(s.relatedShowId)),
        series: (d.series || []).filter(s => s.id !== id),
      };
    });
  }, [setData]);

  return {
    data, loaded,
    addShow, updateShow, removeShow,
    addSchedule, updateSchedule, removeSchedule,
    addExpense, updateExpense, removeExpense,
    addSeries, removeSeries,
  };
}
