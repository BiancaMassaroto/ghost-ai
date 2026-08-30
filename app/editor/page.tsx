import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { getUserProjects } from "@/lib/get-projects";

/**
 * Editor home — server component per `07-wire-editor-home.md`. Fetches the
 * signed-in user's owned and shared projects server-side and passes both
 * lists into `EditorShell`; no client-side fetching for the initial load.
 * `proxy.ts` already protects this route, so the `redirect` below is a
 * defensive fallback, not the primary path (same pattern as `app/page.tsx`).
 */
export default async function EditorPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const { owned, shared } = await getUserProjects(userId, email);

  return <EditorShell ownedProjects={owned} sharedProjects={shared} />;
}
