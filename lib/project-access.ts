import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Project } from "@/app/generated/prisma/client";

export type ProjectAccessRole = "owner" | "collaborator";

export interface CurrentIdentity {
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Resolves the signed-in Clerk user's ID, primary email address, display
 * name, and avatar URL, or `null` if there's no session. Centralizes the
 * identity lookup that every project-scoped page and route needs (`auth()`
 * for the ID, `currentUser()` for the rest) — `displayName`/`avatarUrl` were
 * added in `10-liveblocks-setup.md` for the Liveblocks auth route's session
 * user info, matching the same name-derivation fallback already used in
 * `lib/clerk-users.ts` (first + last name, then username, then `null`).
 */
export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || null
    : null;

  return {
    userId,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    displayName,
    avatarUrl: user?.imageUrl || null,
  };
}

/**
 * Checks whether the given user may view a project — as its owner or as a
 * collaborator (matched by email; there's no collaborator-invite flow with
 * Clerk user IDs yet). Returns the project row and the resolved role, or
 * `null` if the project doesn't exist or the user has no access — callers
 * should treat both cases the same (render `AccessDenied`) rather than
 * leaking which one it was.
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  email: string | null,
): Promise<{ project: Project; role: ProjectAccessRole } | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  if (project.ownerId === userId) return { project, role: "owner" };

  if (email) {
    const collaborator = await prisma.projectCollaborator.findUnique({
      where: { projectId_email: { projectId, email } },
    });
    if (collaborator) return { project, role: "collaborator" };
  }

  return null;
}

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
