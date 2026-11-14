type StorageLike = Pick<Storage, "removeItem">;

export const LOCAL_WORKSPACE_DATA_KEYS = [
  "carvio.applications.v1",
  "carvio.contacts.v1",
  "carvio.feedback.v1",
  "carvio.resumes.v1",
  "carvio.search-profile.v1",
  "carvio.recovery.v1",
  "carvio.profile.v1",
  "carvio.checkin.v1",
  "carvio.analytics-sample-pack.v1",
  "carvio.action-events.v1",
  "carvio.search-tasks.v1",
] as const;

export function clearLocalWorkspaceData(workspace: StorageLike, local: StorageLike, session: StorageLike) {
  LOCAL_WORKSPACE_DATA_KEYS.forEach((key) => workspace.removeItem(key));
  local.removeItem("carvio.analytics-last-active-day.v1");
  ["carvio.analytics-session.v1", "carvio.product-session.workspace", "carvio.product-session.demo"].forEach((key) => session.removeItem(key));
}
