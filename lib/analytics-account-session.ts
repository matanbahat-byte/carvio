export function createAccountSession(storage: { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }, makeId: () => string) {
  const prefix = "carvio.analytics-session.v2";
  let owner: string | null = null;
  let id = makeId();
  return {
    get id() { return id; },
    setOwner(next: string | null) {
      if (next === owner) return id;
      if (owner) storage.remove(`${prefix}:${owner}`);
      owner = next;
      id = next ? storage.get(`${prefix}:${next}`) || makeId() : makeId();
      if (next) storage.set(`${prefix}:${next}`, id);
      return id;
    },
  };
}
