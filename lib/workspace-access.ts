export const LOCAL_WORKSPACE_OWNER_KEY = "carvio.cloud-local-owner.v1";

type AccessStorage = Pick<Storage, "getItem" | "setItem">;
export type WorkspaceAccess = "ready" | "locked" | "unavailable";

/**
 * Protect existing local-first data without moving, deleting, or uploading it.
 * An unowned guest workspace becomes private to the first authenticated account.
 * Once owned, only that same authenticated account may mount the workspace.
 */
export function resolveWorkspaceAccess(storageSource: AccessStorage | (() => AccessStorage), userId: string | null): WorkspaceAccess {
  try {
    const storage = typeof storageSource === "function" ? storageSource() : storageSource;
    const owner = storage.getItem(LOCAL_WORKSPACE_OWNER_KEY);
    if (owner) return owner === userId ? "ready" : "locked";
    if (userId) storage.setItem(LOCAL_WORKSPACE_OWNER_KEY, userId);
    return "ready";
  } catch {
    // Unable to verify ownership must never fall back to exposing private data.
    return "unavailable";
  }
}
