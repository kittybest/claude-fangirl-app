import { useState, useCallback, useEffect, useRef } from 'react';
import { AppData, Show, Schedule, Expense, Series, Artist, Venue } from '../types';
import { generateId } from '../utils/id';
import { migrateArtists, mergeArtistData, resolveArtistNames } from '../utils/artists';
import { migrateVenues, mergeVenueData, resolveVenueName, resolveVenueNames } from '../utils/venues';

const STORAGE_KEY = 'fangirl-app-data';

const empty: AppData = { shows: [], schedules: [], expenses: [], series: [], artists: [], venues: [] };

const backupPromises = new Map<string, Promise<boolean>>();
/** Tags whose snapshot must exist before migrated data may be written back. */
let requiredBackups: string[] = [];

/** Snapshots the pre-migration data server-side. Remembers success, retries failure. */
function ensureBackup(tag: string): Promise<boolean> {
  const pending = backupPromises.get(tag);
  if (pending) return pending;
  const request = fetch(`/api/backup?tag=${tag}`, { method: 'POST' })
    .then(res => res.ok)
    .catch(() => false)
    .then(ok => {
      if (!ok) backupPromises.delete(tag);
      return ok;
    });
  backupPromises.set(tag, request);
  return request;
}

function ensureRequiredBackups(): Promise<boolean> {
  return Promise.all(requiredBackups.map(ensureBackup)).then(results => results.every(Boolean));
}

function getLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)).data : empty;
  } catch {
    return empty;
  }
}

function normalize(data: Record<string, unknown>): { data: AppData; migrated: boolean } {
  const base = {
    shows: Array.isArray(data.shows) ? data.shows : [],
    schedules: Array.isArray(data.schedules) ? data.schedules : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    series: Array.isArray(data.series) ? data.series : [],
    artists: Array.isArray(data.artists) ? data.artists : [],
    venues: Array.isArray(data.venues) ? data.venues : [],
  } as AppData;
  const artistPass = migrateArtists(base);
  const venuePass = migrateVenues(artistPass.data);
  // Each migration keeps its own snapshot — restoring the artist one would also
  // undo every alias tidied up since then.
  const tags = [
    ...(artistPass.changed ? ['pre-artists'] : []),
    ...(venuePass.changed ? ['pre-venues'] : []),
  ];
  requiredBackups = [...new Set([...requiredBackups, ...tags])];
  return { data: venuePass.data, migrated: tags.length > 0 };
}

async function fetchRemote(): Promise<{ data: AppData; migrated: boolean }> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const raw = await res.json();
      const { data, migrated } = normalize(raw);
      if (data.shows.length > 0 || data.schedules.length > 0 || data.expenses.length > 0 || data.series.length > 0) {
        return { data, migrated };
      }
      // Remote empty — check local for migration
      const local = getLocal();
      if (local.shows.length > 0 || local.schedules.length > 0 || local.expenses.length > 0) {
        await saveRemote(local);
        return { data: local, migrated: false };
      }
      return { data: empty, migrated: false };
    }
  } catch { /* 遠端讀取失敗（離線或 API 掛掉）時降級讀 localStorage */ }
  return { data: getLocal(), migrated: false };
}

async function saveRemote(data: AppData): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  void ensureRequiredBackups(); // never blocks an edit, just keeps retrying in the background
  try {
    await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch { /* 上面已先寫進 localStorage，遠端存檔失敗不影響本地資料 */ }
}

export function useAppData() {
  const [data, setDataState] = useState<AppData>(getLocal);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchRemote().then(async ({ data: d, migrated }) => {
      setDataState(d);
      setLoaded(true);
      // Only write the migration back once the snapshot is safely stored;
      // otherwise leave the remote untouched and retry on the next load.
      if (migrated) {
        if (await ensureRequiredBackups()) await saveRemote(d);
        else console.warn('Backup failed — migration not written back');
      }
    });
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
    const newId = generateId();
    setData(d => {
      const { artistIds, artists } = resolveArtistNames(d.artists, show.artists);
      const { venueId, venues } = resolveVenueName(d.venues, show.venue, show.venueUrl);
      return {
        ...d,
        artists,
        venues,
        shows: [...d.shows, { ...show, id: newId, artistIds, venueId }],
        // If show has seriesId, add it to that series' showIds
        series: show.seriesId
          ? d.series.map(sr => sr.id === show.seriesId ? { ...sr, showIds: [...sr.showIds, newId] } : sr)
          : d.series,
      };
    });
  }, [setData]);

  const updateShow = useCallback((id: string, updates: Partial<Omit<Show, 'id'>>) => {
    setData(d => {
      const oldShow = d.shows.find(s => s.id === id);
      const oldSeriesId = oldShow?.seriesId;
      const newSeriesId = updates.seriesId;

      let series = d.series;
      // If seriesId changed, update both old and new series' showIds
      if (newSeriesId !== undefined && newSeriesId !== oldSeriesId) {
        series = series.map(sr => {
          if (sr.id === oldSeriesId) {
            return { ...sr, showIds: sr.showIds.filter(sid => sid !== id) };
          }
          if (sr.id === newSeriesId) {
            return { ...sr, showIds: [...sr.showIds, id] };
          }
          return sr;
        });
      }

      // Re-resolve ids whenever the typed names change, so the two never drift
      let artists = d.artists;
      let resolved: string[] | undefined;
      if (updates.artists !== undefined) {
        const result = resolveArtistNames(d.artists, updates.artists);
        artists = result.artists;
        resolved = result.artistIds;
      }

      let venues = d.venues;
      let venuePatch: { venueId?: string } | undefined;
      if (updates.venue !== undefined || updates.venueUrl !== undefined) {
        const name = updates.venue !== undefined ? updates.venue : oldShow?.venue;
        const url = updates.venueUrl !== undefined ? updates.venueUrl : oldShow?.venueUrl;
        const result = resolveVenueName(d.venues, name, url);
        venues = result.venues;
        venuePatch = { venueId: result.venueId };
      }

      return {
        ...d,
        artists,
        venues,
        shows: d.shows.map(s =>
          s.id === id ? { ...s, ...updates, ...(resolved ? { artistIds: resolved } : {}), ...venuePatch } : s
        ),
        series,
      };
    });
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
    setData(d => {
      const { artistIds, artists } = resolveArtistNames(d.artists, expense.artists);
      return {
        ...d,
        artists,
        expenses: [...d.expenses, { ...expense, id: generateId(), artistIds }],
      };
    });
  }, [setData]);

  const updateExpense = useCallback((id: string, updates: Partial<Omit<Expense, 'id'>>) => {
    setData(d => {
      let artists = d.artists;
      let resolved: string[] | undefined;
      if (updates.artists !== undefined) {
        const result = resolveArtistNames(d.artists, updates.artists);
        artists = result.artists;
        resolved = result.artistIds;
      }
      return {
        ...d,
        artists,
        expenses: d.expenses.map(e =>
          e.id === id ? { ...e, ...updates, ...(resolved ? { artistIds: resolved } : {}) } : e
        ),
      };
    });
  }, [setData]);

  const removeExpense = useCallback((id: string) => {
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  }, [setData]);

  // Series — batch create shows
  const addSeries = useCallback((title: string, artistNames: string[], items: { date: string; venue: string }[]) => {
    const seriesId = generateId();
    const newShowIds = items.map(() => generateId());
    setData(d => {
      const { artistIds, artists } = resolveArtistNames(d.artists, artistNames);
      const { venueIds, venues } = resolveVenueNames(d.venues, items.map(item => item.venue));
      const newShows: Show[] = items.map((item, i) => ({
        id: newShowIds[i],
        title,
        date: item.date,
        venue: item.venue || undefined,
        venueId: venueIds[i],
        artists: artistNames,
        artistIds,
        links: [],
        seriesId,
        status: 'interested' as const,
      }));
      const series: Series = { id: seriesId, title, showIds: newShowIds };
      return {
        ...d,
        artists,
        venues,
        shows: [...d.shows, ...newShows],
        series: [...(d.series || []), series],
      };
    });
  }, [setData]);

  const updateSeries = useCallback((
    id: string,
    title: string,
    artistNames: string[],
    items: { id?: string; date: string; venue: string }[],
  ) => {
    setData(d => {
      const series = (d.series || []).find(s => s.id === id);
      if (!series) return d;

      const { artistIds, artists } = resolveArtistNames(d.artists, artistNames);
      const { venueIds, venues } = resolveVenueNames(d.venues, items.map(item => item.venue));
      const venueIdByItem = new Map(items.map((item, i) => [item, venueIds[i]]));

      // Existing show IDs in this series
      const existingIds = new Set(series.showIds);

      // Items with id = keep/update, without id = new
      const keptIds = new Set(items.filter(i => i.id).map(i => i.id!));
      const removedIds = [...existingIds].filter(eid => !keptIds.has(eid));

      // New shows to create
      const newShows: Show[] = items.filter(i => !i.id).map(item => ({
        id: generateId(),
        title,
        date: item.date,
        venue: item.venue || undefined,
        venueId: venueIdByItem.get(item),
        artists: artistNames,
        artistIds,
        links: [],
        seriesId: id,
        status: 'interested' as const,
      }));

      // Update existing shows (title, venue, artists)
      const updatedShows = d.shows
        .filter(s => !removedIds.includes(s.id))
        .map(s => {
          if (!existingIds.has(s.id)) return s;
          const item = items.find(i => i.id === s.id);
          if (!item) return s;
          return {
            ...s, title, artists: artistNames, artistIds,
            venue: item.venue || undefined,
            venueId: venueIdByItem.get(item),
          };
        });

      const allShowIds = [
        ...items.filter(i => i.id).map(i => i.id!),
        ...newShows.map(s => s.id),
      ];

      return {
        ...d,
        artists,
        venues,
        shows: [...updatedShows, ...newShows],
        schedules: d.schedules.filter(s => !s.relatedShowId || !removedIds.includes(s.relatedShowId)),
        series: (d.series || []).map(s =>
          s.id === id ? { ...s, title, showIds: allShowIds } : s
        ),
      };
    });
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

  // Artists
  const addArtist = useCallback((artist: Artist) => {
    setData(d => d.artists.some(a => a.id === artist.id) ? d : { ...d, artists: [...d.artists, artist] });
  }, [setData]);

  const updateArtist = useCallback((id: string, updates: Partial<Omit<Artist, 'id'>>) => {
    setData(d => ({
      ...d,
      artists: d.artists.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }, [setData]);

  const mergeArtists = useCallback((fromId: string, intoId: string) => {
    setData(d => mergeArtistData(d, fromId, intoId));
  }, [setData]);

  const removeArtist = useCallback((id: string) => {
    setData(d => ({
      ...d,
      artists: d.artists
        .filter(a => a.id !== id)
        .map(a => a.groupIds?.includes(id) ? { ...a, groupIds: a.groupIds.filter(g => g !== id) } : a),
    }));
  }, [setData]);

  // Venues
  const updateVenue = useCallback((id: string, updates: Partial<Omit<Venue, 'id'>>) => {
    setData(d => ({
      ...d,
      venues: d.venues.map(v => v.id === id ? { ...v, ...updates } : v),
    }));
  }, [setData]);

  const mergeVenues = useCallback((fromId: string, intoId: string) => {
    setData(d => mergeVenueData(d, fromId, intoId));
  }, [setData]);

  const removeVenue = useCallback((id: string) => {
    setData(d => ({ ...d, venues: d.venues.filter(v => v.id !== id) }));
  }, [setData]);

  return {
    data, loaded,
    addShow, updateShow, removeShow,
    addSchedule, updateSchedule, removeSchedule,
    addExpense, updateExpense, removeExpense,
    addSeries, updateSeries, removeSeries,
    addArtist, updateArtist, mergeArtists, removeArtist,
    updateVenue, mergeVenues, removeVenue,
  };
}
