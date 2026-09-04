import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { requireProjectOwner } from "@/lib/project-access";
import { readJsonBody } from "@/lib/api-request";
import { deleteProjectBlobs } from "@/lib/project-cleanup";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/** PATCH /api/projects/[projectId] — renames a project. Owner-only. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { projectId } = await params;
  const access = await requireProjectOwner(projectId, auth.userId);
  if ("error" in access) return access.error;

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;
  const body = bodyResult.body;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: access.project.id },
    data: { name },
  });

  return NextResponse.json({ project });
}

/**
 * DELETE /api/projects/[projectId] — deletes a project. Owner-only.
 *
 * Reads every blob this project owns (its canvas snapshot, every generated
 * spec's Markdown) *before* deleting the row — `ProjectSpec`'s
 * `onDelete: Cascade` removes those child rows as part of the same delete,
 * so their `filePath`s must be read first or they're gone. `deleteProjectBlobs`
 * (best-effort, not a durable retry workflow — see its own doc comment) then
 * cleans up storage; the database delete happens regardless of whether that
 * cleanup fully succeeded, since a Blob failure shouldn't block the project
 * deletion the user asked for.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { projectId } = await params;
  const access = await requireProjectOwner(projectId, auth.userId);
  if ("error" in access) return access.error;

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    select: { filePath: true },
  });

  await deleteProjectBlobs(
    access.project.canvasJsonPath,
    specs.map((spec) => spec.filePath),
  );

  await prisma.project.delete({ where: { id: access.project.id } });

  return NextResponse.json({ success: true });
}
