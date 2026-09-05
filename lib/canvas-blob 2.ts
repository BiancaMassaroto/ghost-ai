import { get, put } from "@vercel/blob";

import { isCanvasSnapshot } from "@/lib/canvas-snapshot";
import type { CanvasSnapshot } from "@/types/canvas";

/**
 * This project's Vercel Blob store is configured for private access — `put`
 * and `get` both need `access: "private"` (a plain unauthenticated `fetch`
 * against a private blob's URL 401s; `get` sends the read-write token itself).
 */
const BLOB_ACCESS = "private";

/**
 * Blob pathname for a project's canvas snapshot, per
 * `architecture-context.md`'s Storage Model ("canvas snapshots at
 * `canvas/{projectId}.json`"). The single place both save and load derive
 * this from, so the two never drift apart.
 */
function canvasBlobPath(projectId: string): string {
  return `canvas/${projectId}.json`;
}

/**
 * Uploads the current canvas snapshot to Vercel Blob and returns its URL —
 * the value callers store on `Project.canvasJsonPath` (Prisma stays
 * responsible for metadata only, per `21-canvas-autosave.md`). `addRandomSuffix:
 * false` + `allowOverwrite: true` keep the pathname stable across saves
 * (`canvas/{projectId}.json`) instead of accumulating a new blob per save.
 */
export async function saveCanvasSnapshot(
  projectId: string,
  snapshot: CanvasSnapshot,
): Promise<string> {
  const blob = await put(canvasBlobPath(projectId), JSON.stringify(snapshot), {
    access: BLOB_ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return blob.url;
}

/**
 * Result of loading a saved canvas snapshot — deliberately distinguishes
 * "nothing was ever saved" from "something was saved but couldn't be read."
 * A caller (`GET /api/projects/[projectId]/canvas`, and ultimately the
 * client) must never treat the latter as the former: a transient failure
 * (network blip, blob deleted, expired credentials, corrupted JSON) is not
 * proof the canvas started empty, and starting the editor as if it were
 * would let the next autosave permanently overwrite the real snapshot with
 * an empty-derived one. See `21-canvas-autosave.md`'s follow-up fix.
 */
export type LoadCanvasSnapshotResult =
  | { status: "found"; snapshot: CanvasSnapshot }
  | { status: "not-found" }
  | { status: "error" };

/**
 * Fetches a previously saved canvas snapshot from its Vercel Blob URL, via
 * `@vercel/blob`'s own `get` (not a plain `fetch` — the store is private, so
 * an unauthenticated request 401s; `get` attaches the read-write token
 * itself). `"not-found"` means the blob genuinely doesn't exist (safe to
 * treat as "nothing saved yet"); `"error"` covers every other failure —
 * network/auth errors, a non-200 response, invalid JSON, or content that
 * doesn't match `CanvasSnapshot`'s shape (validated via
 * `lib/canvas-snapshot.ts`'s `isCanvasSnapshot`, the same schema
 * `saveCanvasSnapshot`'s caller checks before writing) — none of which imply
 * there's nothing saved, just that it couldn't be read *this time*.
 */
export async function loadCanvasSnapshot(
  blobUrl: string,
): Promise<LoadCanvasSnapshotResult> {
  let result;
  try {
    result = await get(blobUrl, { access: BLOB_ACCESS });
  } catch {
    return { status: "error" };
  }

  if (!result) return { status: "not-found" };
  if (result.statusCode !== 200) return { status: "error" };

  let parsed: unknown;
  try {
    parsed = await new Response(result.stream).json();
  } catch {
    return { status: "error" };
  }

  return isCanvasSnapshot(parsed) ? { status: "found", snapshot: parsed } : { status: "error" };
}
