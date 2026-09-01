import { NextRequest, NextResponse } from "next/server";

import { loadCanvasSnapshot, saveCanvasSnapshot } from "@/lib/canvas-blob";
import { isCanvasSnapshot } from "@/lib/canvas-snapshot";
import { readJsonBody } from "@/lib/api-request";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * PUT /api/projects/[projectId]/canvas — saves the latest canvas snapshot.
 * Owner or collaborator, per `21-canvas-autosave.md` (canvas editing is
 * already collaborative, so saving it is too). Uploads the JSON to Vercel
 * Blob and stores the resulting URL on the project's `canvasJsonPath` —
 * Prisma stays metadata-only, per `architecture-context.md`'s Storage Model.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const access = await checkProjectAccess(projectId, identity.userId, identity.email);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;

  if (!isCanvasSnapshot(bodyResult.body)) {
    return NextResponse.json(
      { error: "nodes and edges must be well-formed canvas nodes/edges" },
      { status: 400 },
    );
  }

  const canvasJsonPath = await saveCanvasSnapshot(projectId, bodyResult.body);

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath },
  });

  return NextResponse.json({ canvasJsonPath });
}

/**
 * GET /api/projects/[projectId]/canvas — reads the project's saved canvas
 * blob URL from Prisma, then the canvas JSON from Vercel Blob. Owner or
 * collaborator, per `21-canvas-autosave.md`. Returns `{ canvas: null }` only
 * when nothing has ever been saved (no `canvasJsonPath`, or the blob is
 * genuinely gone) — a 502 when a saved snapshot exists but couldn't be read
 * this time (network/auth failure, corrupt content). The client must not
 * conflate the two: an unreadable-but-real snapshot is not the same as an
 * empty canvas, and treating it as one would let the next autosave
 * permanently overwrite it — see `lib/canvas-blob.ts`'s
 * `LoadCanvasSnapshotResult`.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const access = await checkProjectAccess(projectId, identity.userId, identity.email);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!access.project.canvasJsonPath) {
    return NextResponse.json({ canvas: null });
  }

  const result = await loadCanvasSnapshot(access.project.canvasJsonPath);

  if (result.status === "error") {
    return NextResponse.json({ error: "Failed to load saved canvas" }, { status: 502 });
  }

  return NextResponse.json({ canvas: result.status === "found" ? result.snapshot : null });
}
