import { AppData, Artist } from '../types';

/**
 * Onew / onew / ONEW / "Onew " all collapse to the same key, so casing and
 * spacing slips never split an artist in two. Different scripts (온유, 李珍基)
 * stay separate on purpose — only a human can decide those are the same person,
 * which is what aliases are for.
 */
export function normalizeName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Ids are derived from the name rather than random, so the migration produces
 * the exact same ids no matter which device or tab runs it, and re-running it
 * is a no-op. FNV-1a + djb2 concatenated for ~64 bits of key space.
 */
export function artistIdFor(name: string): string {
  const key = normalizeName(name);
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2, 33) ^ c;
  }
  return 'a_' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

export interface ArtistIndex {
  byId: Map<string, Artist>;
  byKey: Map<string, Artist>;
}

/** Both the display name and every alias resolve to the artist. First one wins. */
export function buildArtistIndex(artists: Artist[]): ArtistIndex {
  const byId = new Map<string, Artist>();
  const byKey = new Map<string, Artist>();
  for (const artist of artists) {
    byId.set(artist.id, artist);
    for (const name of [artist.name, ...artist.aliases]) {
      const key = normalizeName(name);
      if (key && !byKey.has(key)) byKey.set(key, artist);
    }
  }
  return { byId, byKey };
}

export function findArtist(index: ArtistIndex, name: string): Artist | undefined {
  const key = normalizeName(name);
  return key ? index.byKey.get(key) : undefined;
}

/** Autocomplete: matches against the display name and every alias. */
export function searchArtists(artists: Artist[], query: string, limit = 8): Artist[] {
  const key = normalizeName(query);
  if (!key) return [];
  const hits: { artist: Artist; score: number }[] = [];
  for (const artist of artists) {
    let best = 0;
    for (const name of [artist.name, ...artist.aliases]) {
      const candidate = normalizeName(name);
      if (!candidate.includes(key)) continue;
      best = Math.max(best, candidate === key ? 3 : candidate.startsWith(key) ? 2 : 1);
    }
    if (best > 0) hits.push({ artist, score: best });
  }
  hits.sort((a, b) => b.score - a.score || a.artist.name.localeCompare(b.artist.name));
  return hits.slice(0, limit).map(hit => hit.artist);
}

function uniqueId(index: ArtistIndex, name: string): string {
  const base = artistIdFor(name);
  let id = base;
  let n = 2;
  while (index.byId.has(id)) id = `${base}_${n++}`; // hash collision guard
  return id;
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
