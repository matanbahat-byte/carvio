// Server-side selection foundation. No requests, scheduler or sender.
import { normalizePublicBoardJobs, type PublicBoard, type PublicJob } from './free-job-sources.ts';
import { linkedInRoleTerms, providerCountry, suggestedRoleAlternatives } from './job-search.ts';

export type RadarPreferences = { role: string; country: string; city: string; seniority: string };
export type RadarSubscription = { enabled: boolean; consentVersion: string; preferences: RadarPreferences };
// Must be loaded from trusted server storage, never accepted from browser input.
export type ApprovedRadarBoard = { board: PublicBoard; permissionReference: string };
export type RadarSnapshot = { board: PublicBoard; fetchedAt: string; payload: unknown };
export type SentRadarJob = { id: string; url: string };
// No employers have verified reuse permission in the current repository.
export const APPROVED_RADAR_BOARDS: readonly ApprovedRadarBoard[] = [];

const normalized = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[־–—-]/g, ' ').replace(/[^\p{L}\p{N}&]+/gu, ' ').trim();
const contains = (text: string, term: string) => (` ${normalized(text)} `).includes(` ${normalized(term)} `);
const boardKey = (b: PublicBoard) => `${b.provider}:${b.token.toLowerCase()}:${b.region || 'global'}`;
const urlKey = (s: string) => { const u = new URL(s); u.search = ''; u.hash = ''; return u.href.replace(/\/$/, ''); };
const cities = [['תל אביב', 'tel aviv', 'tel aviv yafo'], ['ירושלים', 'jerusalem'], ['חיפה', 'haifa'], ['ברלין', 'berlin'], ['אמסטרדם', 'amsterdam']];
function locationMatches(job: PublicJob, p: RadarPreferences) {
  // Require explicit country evidence; never infer country from a city or remote label.
  const country = providerCountry(p.country);
  const countryAliases = [country, p.country, ...(country === 'Israel' ? ['ישראל'] : country === 'Germany' ? ['גרמניה'] : country === 'Netherlands' ? ['הולנד'] : [])];
  if (!countryAliases.some(c => contains(job.location, c))) return false;
  if (!p.city.trim()) return true;
  const aliases = cities.find(group => group.some(c => normalized(c) === normalized(p.city))) || [p.city];
  return aliases.some(c => contains(job.location, c));
}
function level(s: string): string | null {
  if (/\b(executive|chief|vp|vice president)\b|סמנכל|סמנכ״ל/.test(normalized(s))) return 'executive';
  if (/\b(director|head of)\b|דירקטור/.test(normalized(s))) return 'director';
  if (/\b(senior|sr|mid senior)\b|בכיר/.test(normalized(s))) return 'senior';
  if (/\b(junior|entry|associate|intern)\b|מתחיל|זוטר/.test(normalized(s))) return 'entry';
  if (/\bmanager\b|מנהל|מנהלת/.test(normalized(s))) return 'manager';
  return null;
}
function roleMatches(title: string, p: RadarPreferences) {
  const terms = [...linkedInRoleTerms(p.role), ...suggestedRoleAlternatives(p.role)];
  if (!terms.some(term => contains(title, term))) return false;
  const expected = level(p.seniority) || level(p.role);
  const actual = level(title);
  // Unknown requested levels fail closed; unrequested seniority must still match the role.
  if (p.seniority.trim() && !level(p.seniority)) return false;
  return expected ? actual === expected : !actual;
}

export function selectRadarJobs(input: {
  subscription: RadarSubscription;
  snapshots: readonly RadarSnapshot[];
  sent: readonly SentRadarJob[] | null; // null means history unavailable: do not risk resends
  now: Date;
  approvedBoards?: readonly ApprovedRadarBoard[];
}): { jobs: PublicJob[]; blockers: string[] } {
  const { subscription, now } = input;
  const blockers: string[] = [];
  if (!subscription.enabled || subscription.consentVersion !== 'job-radar-v1') return { jobs: [], blockers: ['consent_required'] };
  if (input.sent === null) return { jobs: [], blockers: ['sent_history_unavailable'] };
  if (!Number.isFinite(now.getTime())) return { jobs: [], blockers: ['invalid_clock'] };
  const approved = (input.approvedBoards || APPROVED_RADAR_BOARDS).filter(x => x.permissionReference.trim());
  if (!approved.length) return { jobs: [], blockers: ['no_authorized_source'] };
  const p = subscription.preferences;
  if (!p.role.trim() || !p.country.trim()) return { jobs: [], blockers: ['incomplete_preferences'] };
  const ids = new Set(input.sent.map(x => x.id));
  const urls = new Set(input.sent.map(x => urlKey(x.url)));
  const candidates: PublicJob[] = [];
  for (const source of approved) {
    const snapshot = input.snapshots.filter(s => boardKey(s.board) === boardKey(source.board))
      .sort((a,b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt))[0];
    const age = snapshot ? now.getTime() - Date.parse(snapshot.fetchedAt) : NaN;
    if (!snapshot || !Number.isFinite(age) || age < 0 || age > 15 * 60_000) { blockers.push(`fresh_snapshot_required:${boardKey(source.board)}`); continue; }
    const raw = source.board.provider === 'greenhouse' ? (snapshot.payload as {jobs?: unknown})?.jobs : snapshot.payload;
    if (!Array.isArray(raw)) { blockers.push(`invalid_source_payload:${boardKey(source.board)}`); continue; }
    // Board API snapshot lists current openings. No search links are accepted.
    for (const job of normalizePublicBoardJobs(source.board, snapshot.payload)) {
      const posted = job.postedAt ? Date.parse(job.postedAt) : NaN;
      const days = (now.getTime() - posted) / 86_400_000;
      if (!Number.isFinite(days) || days < 0 || days > 14) continue;
      if (ids.has(job.id) || urls.has(urlKey(job.url))) continue;
      if (locationMatches(job, p) && roleMatches(job.title, p)) candidates.push(job);
    }
  }
  // Newest first, stable tie-breaker, deduplicate across all boards and sent history.
  candidates.sort((a,b) => Date.parse(b.postedAt!) - Date.parse(a.postedAt!) || a.id.localeCompare(b.id));
  const jobs: PublicJob[] = [];
  for (const job of candidates) {
    const key = urlKey(job.url);
    if (ids.has(job.id) || urls.has(key)) continue;
    ids.add(job.id); urls.add(key); jobs.push(job);
    if (jobs.length === 5) break;
  }
  return { jobs, blockers: [...new Set(blockers)] };
}
