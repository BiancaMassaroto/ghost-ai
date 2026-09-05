import { del } from "@vercel/blob";

/**
 * Best-effort deletion of every Vercel Blob object a project owns — its
 * canvas snapshot (`Project.canvasJsonPath`) and every generated spec's
 * Markdown (`ProjectSpec.filePath`) — called right before the project row
 * itself is deleted.
 *
 * Needed because `ProjectSpec`'s `onDelete: Cascade` (and `Project` deletion
 * generally) only removes database rows — Postgres has no way to reach into
 * Vercel Blob, so without this, deleting a project would silently orphan
 * every blob it ever wrote, forever. Per `architecture-context.md`'s Storage
 * Model ("Prisma stores only the blob URL reference"), the database was
 * never the source of truth for that content in the first place, so cascade
 * alone was never going to clean it up.
 *
 * Deliberately best-effort, not a durable retry-backed workflow: a failed
 * delete (network blip, an already-gone blob, an expired token) is swallowed
 * rather than blocking the project deletion the user actually asked for —
 * refusing to delete a project because Blob cleanup failed would be worse.
 * `del()` on a pathname that was never written, or is already gone, is a
 * no-op per `@vercel/blob`'s own semantics, not something this needs to
 * special-case. This does mean a transient failure here can still leave an
 * orphaned blob behind with nothing queued to retry it — a true durable
 * cleanup workflow is a separate piece of infrastructure this app doesn't
 * have yet for any cleanup task, not just this one; see
 * `progress-tracker.md`'s notes on this trade-off.
 */
export async function deleteProjectBlobs(
  canvasJsonPath: string | null,
  specFilePaths: string[],
): Promise<void> {
  const urls = [...(canvasJsonPath ? [canvasJsonPath] : []), ...specFilePaths];
  if (urls.length === 0) return;

  try {
    await del(urls);
  } catch {
    // Best-effort — see this function's own doc comment above.
  }
}
