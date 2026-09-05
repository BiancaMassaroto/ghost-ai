import { get, put } from "@vercel/blob";

/**
 * Same store, same reasoning as `lib/canvas-blob.ts`: this project's Vercel
 * Blob store is provisioned for private access — `put`/`get` both need
 * `access: "private"`, since a plain unauthenticated `fetch` against a
 * private blob's URL 401s.
 */
const BLOB_ACCESS = "private";

/**
 * Blob pathname for one generated spec, per `architecture-context.md`'s
 * Storage Model (`specs/{projectId}/{specId}.md`). The single place both
 * save and load derive this from, so the two never drift apart.
 */
function specBlobPath(projectId: string, specId: string): string {
  return `specs/${projectId}/${specId}.md`;
}

/**
 * Uploads a generated spec's Markdown content to Vercel Blob and returns its
 * URL — the value the caller stores on `ProjectSpec.filePath` (Prisma stays
 * responsible for metadata only, per `28-spec-persistance-download.md`).
 * `addRandomSuffix: false` keeps the pathname exactly `specs/{projectId}/{specId}.md`;
 * `allowOverwrite` is harmless here since each spec gets its own unique
 * `specId` and is written exactly once.
 */
export async function saveSpecMarkdown(
  projectId: string,
  specId: string,
  markdown: string,
): Promise<string> {
  const blob = await put(specBlobPath(projectId, specId), markdown, {
    access: BLOB_ACCESS,
    contentType: "text/markdown",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return blob.url;
}

/**
 * Result of loading a saved spec — mirrors `lib/canvas-blob.ts`'s
 * `LoadCanvasSnapshotResult`, distinguishing "no such blob" from "something
 * went wrong reading it" so a caller (the download route) can return a 404
 * versus a 502 instead of collapsing both into "not found."
 */
export type LoadSpecMarkdownResult =
  | { status: "found"; markdown: string }
  | { status: "not-found" }
  | { status: "error" };

/**
 * Fetches a previously saved spec's Markdown from its Vercel Blob URL, via
 * `@vercel/blob`'s own `get` (not a plain `fetch` — the store is private, so
 * an unauthenticated request 401s; `get` attaches the read-write token
 * itself).
 */
export async function loadSpecMarkdown(blobUrl: string): Promise<LoadSpecMarkdownResult> {
  let result;
  try {
    result = await get(blobUrl, { access: BLOB_ACCESS });
  } catch {
    return { status: "error" };
  }

  if (!result) return { status: "not-found" };
  if (result.statusCode !== 200) return { status: "error" };

  try {
    const markdown = await new Response(result.stream).text();
    return { status: "found", markdown };
  } catch {
    return { status: "error" };
  }
}
