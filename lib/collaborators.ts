import { prisma } from "@/lib/prisma";
import { getClerkUsersByEmail } from "@/lib/clerk-users";
import type { Collaborator } from "@/types/collaborator";

/**
 * Lists a project's collaborators, enriched with Clerk display name and
 * avatar where a Clerk user exists for the stored email — falling back to
 * the email alone otherwise, per `09-share-dialog.md`.
 */
export async function listCollaborators(projectId: string): Promise<Collaborator[]> {
  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  const clerkUsers = await getClerkUsersByEmail(rows.map((row) => row.email));

  return rows.map((row) => {
    const summary = clerkUsers.get(row.email.toLowerCase());
    return {
      id: row.id,
      email: row.email,
      displayName: summary?.displayName ?? null,
      imageUrl: summary?.imageUrl ?? null,
    };
  });
}
