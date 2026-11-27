// Internal worker helper, never a browser endpoint. Empty approval list blocks all live calls.
import { publicBoardEndpoint } from './free-job-sources.ts';
import { APPROVED_RADAR_BOARDS, type ApprovedRadarBoard, type RadarSnapshot } from './job-radar-selection.ts';

export function createRadarSourceCollector(request: typeof fetch = fetch, approved: readonly ApprovedRadarBoard[] = APPROVED_RADAR_BOARDS) {
  const cache = new Map<string, { snapshot?: RadarSnapshot; retryAt: number }>();
  const pending = new Map<string, Promise<RadarSnapshot | null>>();
  return async function collect(): Promise<{ snapshots: RadarSnapshot[]; blockers: string[] }> {
    const snapshots: RadarSnapshot[] = [];
    const blockers: string[] = [];
    if (!approved.length) return { snapshots, blockers: ['no_authorized_source'] };
    // Hard per-run budget; repeated users reuse snapshots and in-flight requests.
    for (const source of approved.slice(0, 5)) {
      if (!source.permissionReference.trim()) { blockers.push('permission_reference_required'); continue; }
      let endpoint: string;
      try { endpoint = publicBoardEndpoint(source.board); } catch { blockers.push('invalid_board'); continue; }
      const now = Date.now();
      const cached = cache.get(endpoint);
      if (cached && cached.retryAt > now) {
        if (cached.snapshot) snapshots.push(cached.snapshot);
        else blockers.push(`source_backoff:${source.board.token}`);
        continue;
      }
      let task = pending.get(endpoint);
      if (!task) {
        task = (async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          try {
            const response = await request(endpoint, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Source unavailable');
            if (Number(response.headers.get('content-length')) > 2_000_000 || !response.body) throw new Error('Oversized source');
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let size = 0;
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) break;
              size += chunk.value.byteLength;
              if (size > 2_000_000) { await reader.cancel(); throw new Error('Oversized source'); }
              chunks.push(chunk.value);
            }
            const bytes = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
            const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
            const records = source.board.provider === 'greenhouse' ? (payload as {jobs?:unknown})?.jobs : payload;
            if (!Array.isArray(records)) throw new Error('Invalid source payload');
            const snapshot: RadarSnapshot = { board: source.board, fetchedAt: new Date().toISOString(), payload };
            cache.set(endpoint, { snapshot, retryAt: Date.now() + 5 * 60_000 });
            return snapshot;
          } catch {
            cache.set(endpoint, { retryAt: Date.now() + 5 * 60_000 });
            return null;
          } finally { clearTimeout(timer); pending.delete(endpoint); }
        })();
        pending.set(endpoint, task);
      }
      const snapshot = await task;
      if (snapshot) snapshots.push(snapshot);
      else blockers.push(`source_unavailable:${source.board.token}`);
    }
    return { snapshots, blockers };
  };
}
