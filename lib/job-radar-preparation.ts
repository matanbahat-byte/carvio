// Internal preparation only. Use a request-scoped authenticated Supabase client.
// No user ID from browser input, no privileged key, no writes and no sender.
import type { SupabaseClient } from '@supabase/supabase-js';
import { selectRadarJobs, type RadarSnapshot, type RadarSubscription } from './job-radar-selection.ts';
import type { ApprovedRadarBoard } from './job-radar-selection.ts';
import type { PublicJob } from './free-job-sources.ts';

type Collection = { snapshots: RadarSnapshot[]; blockers: string[] };
type Preparation = { jobs: PublicJob[]; blockers: string[] };
const blocked = (reason: string): Preparation => ({ jobs: [], blockers: [reason] });
export async function prepareRadarJobs(
  client: SupabaseClient,
  collect: () => Promise<Collection>,
  options: { now?: () => Date; approvedBoards?: readonly ApprovedRadarBoard[] } = {},
): Promise<Preparation> {
  try {
    const { data: auth, error: authError } = await client.auth.getUser();
    const user = auth.user;
    if (authError || !user?.email_confirmed_at || user.is_anonymous) return blocked('verified_account_required');
    const readPreferences = () => client.from('job_radar_preferences')
      .select('enabled,preferences,consent_version,updated_at')
      .eq('user_id', user.id).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
    const { data: saved, error: preferenceError } = await readPreferences();
    if (preferenceError) return blocked('preferences_unavailable');
    if (!saved?.enabled || saved.consent_version !== 'job-radar-v1') return blocked('consent_required');
    if (!saved.updated_at || !saved.preferences || ['role', 'country', 'city', 'seniority'].some(k => typeof saved.preferences[k] !== 'string')) return blocked('invalid_preferences');
    const history = await client.from('job_radar_deliveries').select('job_id,job_url', { count: 'exact' })
      .eq('user_id', user.id).order('job_id').range(0, 999).abortSignal(AbortSignal.timeout(5000));
    // Never treat a failed or truncated history read as an empty history.
    if (history.error || !Array.isArray(history.data) || history.count !== history.data.length) return blocked('sent_history_unavailable');
    const sent = [];
    for (const row of history.data) {
      if (typeof row.job_id !== 'string' || !row.job_id || typeof row.job_url !== 'string') return blocked('invalid_sent_history');
      try { if (new URL(row.job_url).protocol !== 'https:') return blocked('invalid_sent_history'); }
      catch { return blocked('invalid_sent_history'); }
      sent.push({ id: row.job_id, url: row.job_url });
    }
    const collection = await collect();
    // A revoke or preference edit during source collection invalidates this preparation.
    const { data: current, error: recheckError } = await readPreferences();
    if (recheckError || !current?.enabled || current.consent_version !== saved.consent_version || current.updated_at !== saved.updated_at) return blocked('preferences_changed');
    const subscription: RadarSubscription = { enabled: saved.enabled, consentVersion: saved.consent_version, preferences: saved.preferences };
    const selection = selectRadarJobs({ subscription, snapshots: collection.snapshots, sent, now: options.now?.() || new Date(), approvedBoards: options.approvedBoards });
    return { jobs: selection.jobs, blockers: [...new Set([...collection.blockers, ...selection.blockers])] };
  } catch { return blocked('preparation_unavailable'); }
}
