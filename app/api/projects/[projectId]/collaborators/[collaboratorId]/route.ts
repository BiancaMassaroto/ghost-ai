import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { requireProjectOwner } from "@/lib/project-access";
import { listCollaborators } from "@/lib/collaborators";

interface RouteParams {
  params: Promise<{ projectId: string; collaboratorId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/collaborators/[collaboratorId] —
 * removes a collaborator. Owner-only.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { projectId, collaboratorId } = await params;
  const access = await requireProjectOwner(projectId, auth.userId);
  if ("error" in access) return access.error;

  const collaborator = await prisma.projectCollaborator.findUnique({
    where: { id: collaboratorId },
  });
  if (!collaborator || collaborator.projectId !== access.project.id) {
    return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  }

  await prisma.projectCollaborator.delete({ where: { id: collaboratorId } });

  const collaborators = await listCollaborators(projectId);
  return NextResponse.json({ collaborators });
}
