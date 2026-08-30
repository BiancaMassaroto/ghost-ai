import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorShell } from "@/components/editor/editor-shell";
import { getProjectAccess, getUserProjects } from "@/lib/get-projects";
import { getCurrentIdentity } from "@/lib/project-access";

interface EditorRoomPageProps {
  params: Promise<{ roomId: string }>;
}

/**
 * A project's workspace route — `/editor/[roomId]`, per
 * `08-editor-workspace-shell.md`. The room ID is the project's own database
 * ID (see the room ID decision in `progress-tracker.md`) — there is no
 * separate stored room ID field. Renders `AccessDenied`, not a 404, for
 * both a non-existent project and one the signed-in user can't access
 * (`getProjectAccess` already merges those into a single `null` case, so
 * this page can't distinguish — and shouldn't).
 */
export default async function EditorRoomPage({ params }: EditorRoomPageProps) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");

  const { roomId } = await params;

  const [activeProject, { owned, shared }] = await Promise.all([
    getProjectAccess(roomId, identity.userId, identity.email),
    getUserProjects(identity.userId, identity.email),
  ]);

  if (!activeProject) return <AccessDenied />;

  return (
    <EditorShell
      ownedProjects={owned}
      sharedProjects={shared}
      activeProject={activeProject}
    />
  );
}
