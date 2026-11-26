type Storage = { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void };
export function createAccountSession(storage: Storage, makeId: () => string, shared?: Pick<Storage, "get" | "set">, now = Date.now) {
  const prefix = "carvio.analytics-session.v2";
  const ttl = 30 * 60_000;
  let owner: string | null = null;
  let initialized = false;
  let id = makeId();
  function coordinate() {
    if (!owner || !shared) return id;
    const key = `carvio.analytics-shared.v1:${owner}`;
    const raw = shared.get(key);
    let valid = false;
    if (raw) {
      try {
        const value = JSON.parse(raw);
        if (typeof value.id === "string" && value.id && Number.isFinite(value.at) && now() >= value.at && now() - value.at < ttl) {
          id = value.id;
          valid = true;
        }
      } catch { /* Invalid storage is ignored. */ }
    }
    if (!valid) id = makeId();
    shared.set(key, JSON.stringify({ id, at: now() }));
    return id;
  }
  return {
    get id() { return coordinate(); },
    setOwner(next: string | null) {
      if (initialized && next === owner) return id;
      const priorOwner = owner || storage.get(`${prefix}:owner`);
      if (priorOwner && priorOwner !== next) storage.remove(`${prefix}:${priorOwner}`);
      initialized = true;
      owner = next;
      id = next ? storage.get(`${prefix}:${next}`) || makeId() : makeId();
      if (next) { storage.set(`${prefix}:${next}`, id); storage.set(`${prefix}:owner`, next); }
      else storage.remove(`${prefix}:owner`);
      return coordinate();
    },
  };
}
