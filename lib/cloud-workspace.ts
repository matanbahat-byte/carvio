import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceBaseline = { userId: string; updatedAt: string | null };

export class WorkspaceConflictError extends Error {
  constructor() {
    super("The cloud workspace changed. Restore the latest cloud copy before saving again.");
    this.name = "WorkspaceConflictError";
  }
}

/** A null revision permits INSERT only; existing rows always use compare-and-swap. */
export async function writeCloudWorkspace(
  client: SupabaseClient,
  baseline: WorkspaceBaseline,
  workspace: { schemaVersion: number },
) {
  const previousTime = baseline.updatedAt ? Date.parse(baseline.updatedAt) : 0;
  if (!Number.isFinite(previousTime)) throw new WorkspaceConflictError();
  const updatedAt = new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
  const row = {
    user_id: baseline.userId,
    schema_version: workspace.schemaVersion,
    workspace_data: workspace,
    updated_at: updatedAt,
  };
  const query = baseline.updatedAt === null
    ? client.from("user_workspaces").insert(row)
    : client.from("user_workspaces").update(row).eq("user_id", baseline.userId).eq("updated_at", baseline.updatedAt);
  const { data, error } = await query.select("updated_at").maybeSingle();
  if (error?.code === "23505") throw new WorkspaceConflictError();
  if (error) throw error;
  if (!data) throw new WorkspaceConflictError();
  return { userId: baseline.userId, updatedAt: data.updated_at as string };
}

export function canSaveCloudWorkspace(baseline: WorkspaceBaseline | null, userId: string, owner: string | null) {
  return baseline?.userId === userId && (!owner || owner === userId);
}

export function isCloudWorkspace(value: unknown): value is {
  schemaVersion: 1; applications: unknown[]; contacts: unknown[]; resumes: unknown[];
  recoveryEntries: unknown[]; actionEvents: unknown[]; language: "en" | "he";
  dailyMood: string; theme: string; searchProfile: object; userProfile: object;
} {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return payload.schemaVersion === 1
    && ["applications", "contacts", "resumes", "recoveryEntries", "actionEvents"].every(key => Array.isArray(payload[key]) && payload[key].every(item => item !== null && typeof item === "object" && !Array.isArray(item)))
    && (payload.searchTasks === undefined || (Array.isArray(payload.searchTasks) && payload.searchTasks.every(item => item !== null && typeof item === "object" && !Array.isArray(item))))
    && ["en", "he"].includes(String(payload.language))
    && typeof payload.dailyMood === "string" && typeof payload.theme === "string"
    && Boolean(payload.searchProfile && typeof payload.searchProfile === "object" && !Array.isArray(payload.searchProfile))
    && Boolean(payload.userProfile && typeof payload.userProfile === "object" && !Array.isArray(payload.userProfile));
}
