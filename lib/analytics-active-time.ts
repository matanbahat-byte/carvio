/** Monotonic active-time accumulator. A focused tab becomes idle after 60s. */
export function createActiveTimeClock(now: number, initiallyActive: boolean, idleMs = 60_000) {
  let sampledAt = now;
  let lastInteraction = now;
  let active = initiallyActive;
  let elapsedMs = 0;
  let reportedSeconds = 0;

  const sample = (at: number) => {
    if (active && at >= sampledAt) {
      elapsedMs += Math.max(0, Math.min(at, lastInteraction + idleMs) - sampledAt);
    }
    sampledAt = Math.max(sampledAt, at);
    return Math.floor(elapsedMs / 1000);
  };

  return {
    sample,
    setActive(at: number, next: boolean) {
      sample(at);
      active = next;
    },
    interact(at: number) {
      sample(at);
      lastInteraction = Math.max(lastInteraction, at);
    },
    takeHeartbeat(at: number) {
      const seconds = sample(at);
      if (seconds <= reportedSeconds) return null;
      reportedSeconds = seconds;
      return seconds;
    },
  };
}
