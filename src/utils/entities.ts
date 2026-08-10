/**
 * Shared plumbing for the name-with-aliases entities (artists, venues).
 * Anything type-specific — roll-up, merging, migration — lives with its own type.
 */

export interface NamedEntity {
  id: string;
  name: string;
  aliases: string[];
  reviewed?: boolean;
}

export interface EntityIndex<T> {
  byId: Map<string, T>;
  byKey: Map<string, T>;
}

/**
 * Onew / onew / ONEW / "Onew " all collapse to the same key, so casing and
 * spacing slips never split an entity in two. Different scripts (온유, 李珍基)
 * stay separate on purpose — only a human can decide those are the same thing,
 * which is what aliases are for.
 */
export function normalizeName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Ids are derived from the name rather than random, so a migration produces the
 * exact same ids no matter which device or tab runs it, and re-running it is a
 * no-op. FNV-1a + djb2 concatenated for ~64 bits of key space.
 */
export function entityIdFor(prefix: string, name: string): string {
  const key = normalizeName(name);
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2, 33) ^ c;
  }
  return prefix + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

/** Both the display name and every alias resolve to the entity. First one wins. */
export function buildIndex<T extends NamedEntity>(entities: T[]): EntityIndex<T> {
  const byId = new Map<string, T>();
  const byKey = new Map<string, T>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
    for (const name of [entity.name, ...entity.aliases]) {
      const key = normalizeName(name);
      if (key && !byKey.has(key)) byKey.set(key, entity);
    }
  }
  return { byId, byKey };
}

export function findEntity<T>(index: EntityIndex<T>, name: string): T | undefined {
  const key = normalizeName(name);
  return key ? index.byKey.get(key) : undefined;
}

export function uniqueEntityId<T>(index: EntityIndex<T>, prefix: string, name: string): string {
  const base = entityIdFor(prefix, name);
  let id = base;
  let n = 2;
  while (index.byId.has(id)) id = `${base}_${n++}`; // hash collision guard
  return id;
}

/** Autocomplete: matches against the display name and every alias. */
export function searchEntities<T extends NamedEntity>(entities: T[], query: string, limit: number): T[] {
  const key = normalizeName(query);
  if (!key) return [];
  const hits: { entity: T; score: number }[] = [];
  for (const entity of entities) {
    let best = 0;
    for (const name of [entity.name, ...entity.aliases]) {
      const candidate = normalizeName(name);
      if (!candidate.includes(key)) continue;
      best = Math.max(best, candidate === key ? 3 : candidate.startsWith(key) ? 2 : 1);
    }
    if (best > 0) hits.push({ entity, score: best });
  }
  hits.sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));
  return hits.slice(0, limit).map(hit => hit.entity);
}
