/** Keeps only the latest edit while a snapshot write is in flight. */
export function createCloudSaveReplay<T>() {
  let generation = 0;
  let pending: { key: string | undefined } | null = null;
  let acknowledged: { key: string | undefined } | null = null;
  return {
    observe(snapshot: T) {
      const key = JSON.stringify(snapshot);
      pending = { key };
      if (acknowledged && acknowledged.key === key) return false;
      return true;
    },
    begin(snapshot: T) {
      const key = JSON.stringify(snapshot);
      if (pending && pending.key === key) pending = null;
      return { generation, key };
    },
    isCurrent(token: { generation: number }) {
      return token.generation === generation;
    },
    finish(token: { generation: number; key: string | undefined }, succeeded: boolean) {
      if (token.generation === generation) {
        if (succeeded) acknowledged = { key: token.key };
        else pending = null; // A failed request must never retry indefinitely.
      }
      return pending !== null && (!acknowledged || pending.key !== acknowledged.key);
    },
    reset() {
      generation += 1;
      pending = null;
      acknowledged = null;
    },
  };
}
