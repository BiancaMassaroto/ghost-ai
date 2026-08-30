import { redirect } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { getUserProjects } from "@/lib/get-projects";
import { getCurrentIdentity } from "@/lib/project-access";

/**
 * Editor home — server component per `07-wire-editor-home.md`. Fetches the
 * signed-in user's owned and shared projects server-side and passes both
 * lists into `EditorShell`; no client-side fetching for the initial load.
 * `proxy.ts` already protects this route, so the `redirect` below is a
 * defensive fallback, not the primary path (same pattern as `app/page.tsx`).
 */
export default async function EditorPage() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");

  const { owned, shared } = await getUserProjects(identity.userId, identity.email);

  return <EditorShell ownedProjects={owned} sharedProjects={shared} />;
}
