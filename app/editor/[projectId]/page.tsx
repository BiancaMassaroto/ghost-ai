import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { getProjectAccess, getUserProjects } from "@/lib/get-projects";

interface EditorProjectPageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * A project's workspace route — the destination "Create" navigates to once
 * `POST /api/projects` returns a project ID, per `07-wire-editor-home.md`.
 * The real collaborative canvas isn't built yet (no feature spec for it),
 * so `EditorShell` renders its placeholder workspace state for whichever
 * project is resolved here. 404s if the project doesn't exist or the
 * signed-in user isn't its owner or a collaborator.
 */
export default async function EditorProjectPage({
  params,
}: EditorProjectPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const [activeProject, { owned, shared }] = await Promise.all([
    getProjectAccess(projectId, userId, email),
    getUserProjects(userId, email),
  ]);

  if (!activeProject) notFound();

  return (
    <EditorShell
      ownedProjects={owned}
      sharedProjects={shared}
      activeProject={activeProject}
    />
  );
}
