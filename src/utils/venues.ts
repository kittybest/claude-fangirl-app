import { AppData, Venue } from '../types';
import {
  EntityIndex, buildIndex, entityIdFor, findEntity, normalizeName, searchEntities, uniqueEntityId,
} from './entities';

const PREFIX = 'v_';

export type VenueIndex = EntityIndex<Venue>;

export const venueIdFor = (name: string) => entityIdFor(PREFIX, name);

export const buildVenueIndex = (venues: Venue[]): VenueIndex => buildIndex(venues);

export const findVenue = (index: VenueIndex, name: string) => findEntity(index, name);

export const searchVenues = (venues: Venue[], query: string, limit = 8) =>
  searchEntities(venues, query, limit);

/** Ids are the source of truth; the raw string is only a fallback for old records. */
export function displayVenue(index: VenueIndex, show: { venue?: string; venueId?: string }): Venue | { name: string; url?: string } | undefined {
  if (show.venueId) {
    const venue = index.byId.get(show.venueId);
    if (venue) return venue;
  }
  return show.venue ? { name: show.venue } : undefined;
}

/** Mutates `list` and `index` — callers own a copy of both. */
function resolveOne(list: Venue[], index: VenueIndex, name: string, url?: string): Venue | undefined {
  const key = normalizeName(name);
  if (!key) return undefined;
  const existing = index.byKey.get(key);
  if (existing) {
    // A link typed on a show belongs to the place; only fill a gap, never clear
    if (!url || existing.url === url) return existing;
    const updated = { ...existing, url };
    list[list.indexOf(existing)] = updated;
    index.byId.set(updated.id, updated);
    for (const alias of [updated.name, ...updated.aliases]) {
      const aliasKey = normalizeName(alias);
      if (index.byKey.get(aliasKey) === existing) index.byKey.set(aliasKey, updated);
    }
    return updated;
  }
  const created: Venue = {
    id: uniqueEntityId(index, PREFIX, key),
    name: name.trim(),
    aliases: [],
    url: url || undefined,
    reviewed: false,
  };
  list.push(created);
  index.byId.set(created.id, created);
  index.byKey.set(key, created);
  return created;
}

/**
 * Turn a typed venue name into an id, creating the venue if it is new so a
 * place never has to be registered up front.
 */
export function resolveVenueName(
  venues: Venue[],
  name?: string,
  url?: string,
): { venueId?: string; venues: Venue[] } {
  if (!name || !normalizeName(name)) return { venueId: undefined, venues };
  const next = [...venues];
  const venue = resolveOne(next, buildVenueIndex(next), name, url);
  return { venueId: venue?.id, venues: next };
}

/** Same, for the series form's batch of rows — one shared venue list. */
export function resolveVenueNames(
  venues: Venue[],
  names: (string | undefined)[],
): { venueIds: (string | undefined)[]; venues: Venue[] } {
  const next = [...venues];
  const index = buildVenueIndex(next);
  const venueIds = names.map(name => (name ? resolveOne(next, index, name)?.id : undefined));
  return { venueIds, venues: next };
}

export interface VenueStatRow {
  key: string;
  name: string;
  city?: string;
  count: number;
}

type StatShow = { venue?: string; venueId?: string };

/**
 * Visit counts per venue. Shows that predate ids fall back to their raw text
 * rather than vanishing from the totals.
 */
export function aggregateByVenue(venues: Venue[], shows: StatShow[]): VenueStatRow[] {
  const index = buildVenueIndex(venues);
  const keyFor = (show: StatShow): string | undefined => {
    if (show.venueId && index.byId.has(show.venueId)) return show.venueId;
    const name = show.venue?.trim();
    if (name) return findVenue(index, name)?.id ?? `raw:${name}`;
    return show.venueId; // dangling id with nothing to fall back on — keep the count
  };

  const counts = new Map<string, number>();
  for (const show of shows) {
    const key = keyFor(show);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts]
    .map(([key, count]) => {
      const venue = index.byId.get(key);
      return { key, name: venue?.name ?? key.replace(/^raw:/, ''), city: venue?.city, count };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Venues with no city land in a single undefined bucket, sorted last. */
export function aggregateByCity(venues: Venue[], shows: StatShow[]): { city?: string; count: number }[] {
  const counts = new Map<string | undefined, number>();
  for (const row of aggregateByVenue(venues, shows)) {
    counts.set(row.city, (counts.get(row.city) || 0) + row.count);
  }
  return [...counts]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => {
      if (!a.city !== !b.city) return a.city ? -1 : 1;
      return b.count - a.count || (a.city || '').localeCompare(b.city || '');
    });
}

export function venueUsage(shows: { venueId?: string }[]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const show of shows) {
    if (show.venueId) usage.set(show.venueId, (usage.get(show.venueId) || 0) + 1);
  }
  return usage;
}

/**
 * Folds `fromId` into `intoId`: its name and aliases become aliases of the
 * target, every show is repointed, and it is removed.
 */
export function mergeVenueData(data: AppData, fromId: string, intoId: string): AppData {
  if (fromId === intoId) return data;
  const from = data.venues.find(v => v.id === fromId);
  const into = data.venues.find(v => v.id === intoId);
  if (!from || !into) return data;

  // The target's own aliases are kept verbatim; only the incoming ones are deduped
  const aliases = [...into.aliases];
  const seen = new Set([normalizeName(into.name), ...aliases.map(normalizeName)]);
  for (const alias of [from.name, ...from.aliases]) {
    const key = normalizeName(alias);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
  }

  const merged: Venue = {
    ...into,
    aliases,
    city: into.city || from.city,
    url: into.url || from.url,
    reviewed: true,
  };

  return {
    ...data,
    venues: data.venues.filter(v => v.id !== fromId).map(v => (v.id === intoId ? merged : v)),
    shows: data.shows.map(s => (s.venueId === fromId ? { ...s, venueId: intoId } : s)),
    runs: (data.runs || []).map(r => (r.venueId === fromId ? { ...r, venueId: intoId } : r)),
  };
}

/**
 * Backfills venueId from the legacy venue string, once per show, carrying the
 * per-show link onto the venue. Also self-heals ids pointing at a lost venue.
 */
export function migrateVenues(data: AppData): { data: AppData; changed: boolean } {
  const venues = [...data.venues];
  const index = buildVenueIndex(venues);
  let changed = false;

  const shows = data.shows.map(show => {
    const legacy = show.venue?.trim();
    if (show.venueId !== undefined) {
      const dangling = !index.byId.has(show.venueId);
      // Nothing to rebuild from — leave the id alone rather than wiping it.
      if (!dangling || !legacy) return show;
    } else if (!legacy) {
      return show; // a show with no venue has nothing to migrate, ever
    }
    const venue = resolveOne(venues, index, legacy!, show.venueUrl);
    if (!venue) return show;
    changed = true;
    return { ...show, venueId: venue.id };
  });

  return { data: { ...data, shows, venues }, changed };
}
