import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Project } from "@/app/generated/prisma/client";

/**
 * Loads a project and verifies the given user owns it. Returns the project
 * on success, or a ready-to-return response (404 if it doesn't exist, 403 if
 * the user isn't the owner) otherwise. Shared by every route that mutates a
 * single project, since rename and delete enforce the same ownership rule.
 */
export async function requireProjectOwner(
  projectId: string,
  userId: string,
): Promise<{ project: Project } | { error: NextResponse }> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  if (project.ownerId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { project };
}
