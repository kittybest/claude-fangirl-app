import { AppData, Artist } from '../types';
import {
  EntityIndex, buildIndex, entityIdFor, findEntity, normalizeName, searchEntities, uniqueEntityId,
} from './entities';

export { normalizeName };

const PREFIX = 'a_';

export type ArtistIndex = EntityIndex<Artist>;

export const artistIdFor = (name: string) => entityIdFor(PREFIX, name);

export const buildArtistIndex = (artists: Artist[]): ArtistIndex => buildIndex(artists);

export const findArtist = (index: ArtistIndex, name: string) => findEntity(index, name);

export const searchArtists = (artists: Artist[], query: string, limit = 8) =>
  searchEntities(artists, query, limit);

const uniqueId = (index: ArtistIndex, name: string) => uniqueEntityId(index, PREFIX, name);

/**
 * Builds an artist that doesn't exist yet, for the cases where you register one
 * deliberately instead of it falling out of a show or expense. Marked reviewed
 * because it was created on purpose — the unreviewed list is the migration to-do.
 */
export function newArtist(artists: Artist[], name: string): Artist {
  return {
    id: uniqueId(buildArtistIndex(artists), name),
    name: name.trim(),
    aliases: [],
    reviewed: true,
  };
}

/** Mutates `list` and `index` — callers own a copy of both. */
function resolveOne(list: Artist[], index: ArtistIndex, name: string): Artist | undefined {
  const key = normalizeName(name);
  if (!key) return undefined;
  const existing = index.byKey.get(key);
  if (existing) return existing;
  const created: Artist = { id: uniqueId(index, key), name: name.trim(), aliases: [], reviewed: false };
  list.push(created);
  index.byId.set(created.id, created);
  index.byKey.set(key, created);
  return created;
}

/**
 * Turn typed names into ids, creating artists for anything unrecognised so a
 * new name never needs to be registered up front.
 */
export function resolveArtistNames(
  artists: Artist[],
  names: string[],
): { artistIds: string[]; artists: Artist[] } {
  const nextArtists = [...artists];
  const index = buildArtistIndex(nextArtists);
  const artistIds: string[] = [];
  for (const name of names) {
    const artist = resolveOne(nextArtists, index, name);
    if (artist && !artistIds.includes(artist.id)) artistIds.push(artist.id);
  }
  return { artistIds, artists: nextArtists };
}

/** Ids are the source of truth; the raw strings are only a fallback for records that predate them. */
export function displayNames(
  index: ArtistIndex,
  record: { artists: string[]; artistIds?: string[] },
): string[] {
  if (!record.artistIds || record.artistIds.length === 0) return record.artists;
  return record.artistIds
    .map(id => index.byId.get(id)?.name)
    .filter((name): name is string => !!name);
}

export function artistUsage(data: AppData): Map<string, { shows: number; expenses: number }> {
  const usage = new Map<string, { shows: number; expenses: number }>();
  const bump = (id: string, field: 'shows' | 'expenses') => {
    const entry = usage.get(id) || { shows: 0, expenses: 0 };
    entry[field]++;
    usage.set(id, entry);
  };
  for (const show of data.shows) for (const id of show.artistIds || []) bump(id, 'shows');
  for (const expense of data.expenses) for (const id of expense.artistIds || []) bump(id, 'expenses');
  return usage;
}

/** Members of a group. One level only — this never recurses. */
export function membersOf(artists: Artist[], groupId: string): Artist[] {
  return artists.filter(a => a.groupIds?.includes(groupId));
}

/**
 * Folds `fromId` into `intoId`: its name and aliases become aliases of the
 * target, every reference is repointed, and it is removed.
 */
export function mergeArtistData(data: AppData, fromId: string, intoId: string): AppData {
  if (fromId === intoId) return data;
  const from = data.artists.find(a => a.id === fromId);
  const into = data.artists.find(a => a.id === intoId);
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

  // Repoint, dedupe, and never let an artist end up in its own group list
  const swap = (ids: string[]) => [...new Set(ids.map(id => (id === fromId ? intoId : id)))];
  const groupIds = swap([...(into.groupIds || []), ...(from.groupIds || [])]).filter(id => id !== intoId);

  const artists = data.artists
    .filter(a => a.id !== fromId)
    .map(a => {
      if (a.id === intoId) return { ...into, aliases, groupIds, reviewed: true };
      if (!a.groupIds?.includes(fromId)) return a;
      return { ...a, groupIds: swap(a.groupIds).filter(id => id !== a.id) };
    });

  const repoint = <T extends { artistIds?: string[] }>(record: T): T =>
    record.artistIds?.includes(fromId) ? { ...record, artistIds: swap(record.artistIds) } : record;

  return {
    ...data,
    artists,
    shows: data.shows.map(repoint),
    expenses: data.expenses.map(repoint),
  };
}

export interface ArtistBucket {
  count: number;
  spent: number;
}

export interface ArtistStatRow {
  key: string;
  name: string;
  /** Group rows roll their members in; everyone else equals `direct`. */
  total: ArtistBucket;
  direct: ArtistBucket;
  members: { id: string; name: string; bucket: ArtistBucket }[];
}

type StatShow = { artists: string[]; artistIds?: string[]; ticketPriceTWD?: number };
type StatExpense = { artists: string[]; artistIds?: string[]; amountTWD: number };

/**
 * Keyed by artist id so name variants can't split a person in two. Records that
 * predate ids fall back to their raw text rather than vanishing from the totals.
 */
export function aggregateByArtist(
  artists: Artist[],
  shows: StatShow[],
  expenses: StatExpense[],
): ArtistStatRow[] {
  const index = buildArtistIndex(artists);
  const keysFor = (record: { artists: string[]; artistIds?: string[] }): Set<string> => {
    if (record.artistIds?.length) return new Set(record.artistIds);
    return new Set(record.artists.map(name => findArtist(index, name)?.id ?? `raw:${name}`));
  };
  const showKeys = shows.map(show => ({ show, keys: keysFor(show) }));
  const expenseKeys = expenses.map(expense => ({ expense, keys: keysFor(expense) }));

  const direct = new Map<string, ArtistBucket>();
  const bump = (key: string, count: number, spent: number) => {
    const bucket = direct.get(key) || { count: 0, spent: 0 };
    bucket.count += count;
    bucket.spent += spent;
    direct.set(key, bucket);
  };
  for (const { show, keys } of showKeys) {
    for (const key of keys) bump(key, 1, show.ticketPriceTWD || 0);
  }
  for (const { expense, keys } of expenseKeys) {
    for (const key of keys) bump(key, 0, expense.amountTWD);
  }

  const membersByGroup = new Map<string, string[]>();
  for (const artist of artists) {
    for (const groupId of artist.groupIds || []) {
      membersByGroup.set(groupId, [...(membersByGroup.get(groupId) || []), artist.id]);
    }
  }

  // A group counts a record once even when it is tagged with both the group and
  // one of its members. Members never roll the group back in.
  const totals = new Map<string, ArtistBucket>([...direct].map(([key, b]) => [key, { ...b }]));
  for (const [groupId, memberIds] of membersByGroup) {
    const scope = new Set([groupId, ...memberIds]);
    const inScope = (keys: Set<string>) => [...keys].some(key => scope.has(key));
    const bucket: ArtistBucket = { count: 0, spent: 0 };
    for (const { show, keys } of showKeys) {
      if (!inScope(keys)) continue;
      bucket.count++;
      bucket.spent += show.ticketPriceTWD || 0;
    }
    for (const { expense, keys } of expenseKeys) {
      if (inScope(keys)) bucket.spent += expense.amountTWD;
    }
    totals.set(groupId, bucket);
  }

  return [...totals]
    .filter(([, bucket]) => bucket.count > 0 || bucket.spent > 0)
    .map(([key, total]) => ({
      key,
      name: index.byId.get(key)?.name ?? key.replace(/^raw:/, ''),
      total,
      direct: direct.get(key) || { count: 0, spent: 0 },
      members: (membersByGroup.get(key) || [])
        .map(id => ({ id, name: index.byId.get(id)?.name ?? id, bucket: direct.get(id) }))
        .filter((m): m is { id: string; name: string; bucket: ArtistBucket } =>
          !!m.bucket && (m.bucket.count > 0 || m.bucket.spent > 0)),
    }))
    .sort((a, b) => b.total.count - a.total.count || b.total.spent - a.total.spent);
}

/**
 * Backfills artistIds from the legacy artists strings, once per record. Also
 * self-heals records whose ids point at artists that went missing (an old
 * client build could drop the artists array when saving).
 */
export function migrateArtists(data: AppData): { data: AppData; changed: boolean } {
  const artists = [...data.artists];
  const index = buildArtistIndex(artists);
  let changed = false;

  const backfill = <T extends { artists: string[]; artistIds?: string[] }>(record: T): T => {
    if (record.artistIds !== undefined) {
      const dangling = record.artistIds.some(id => !index.byId.has(id));
      // Nothing to rebuild from — leave the ids alone rather than wiping them.
      if (!dangling || record.artists.length === 0) return record;
    }
    const artistIds: string[] = [];
    for (const name of record.artists) {
      const artist = resolveOne(artists, index, name);
      if (artist && !artistIds.includes(artist.id)) artistIds.push(artist.id);
    }
    changed = true;
    return { ...record, artistIds } as T;
  };

  const shows = data.shows.map(backfill);
  const expenses = data.expenses.map(backfill);
  return { data: { ...data, shows, expenses, artists }, changed };
}
