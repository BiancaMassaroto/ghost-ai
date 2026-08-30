import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";
import { slugify } from "@/lib/utils";
import type { Project as DbProject } from "@/app/generated/prisma/client";
import type { Project } from "@/types/project";

function toProject(dbProject: DbProject, role: Project["role"]): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    slug: slugify(dbProject.name),
    role,
  };
}

/**
 * Fetches every project the given user can see: projects they own, and
 * projects they've been added to as a collaborator. `ProjectCollaborator`
 * identifies people by email (there's no collaborator invite flow with
 * Clerk user IDs yet), so `email` is required to resolve the shared list —
 * pass `null` if it isn't available and the shared list resolves empty.
 * Shared by the editor home page and the per-project workspace page so both
 * render from the same query, per `07-wire-editor-home.md`.
 */
export async function getUserProjects(
  userId: string,
  email: string | null,
): Promise<{ owned: Project[]; shared: Project[] }> {
  const [ownedRows, collaboratorRows] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    email
      ? prisma.projectCollaborator.findMany({
          where: { email },
          include: { project: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ]);

  return {
    owned: ownedRows.map((project) => toProject(project, "owner")),
    shared: collaboratorRows.map((row) => toProject(row.project, "collaborator")),
  };
}

/**
 * Resolves a single project for display, verifying the given user may view
 * it (owner or collaborator by email) via `checkProjectAccess`. Returns
 * `null` if the project doesn't exist or the user has no access — callers
 * should treat both as the same case (render `AccessDenied`), not leak
 * which one it was.
 */
export async function getProjectAccess(
  projectId: string,
  userId: string,
  email: string | null,
): Promise<Project | null> {
  const access = await checkProjectAccess(projectId, userId, email);
  if (!access) return null;

  return toProject(access.project, access.role);
}
