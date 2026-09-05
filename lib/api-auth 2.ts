import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Resolves the authenticated Clerk user ID for the current request, or a
 * ready-to-return 401 response if there isn't one. `proxy.ts` already gates
 * every non-public route, but for API requests Clerk's own `auth.protect()`
 * responds with a 404 rather than a 401 (see its middleware docs), so route
 * handlers check `auth()` themselves to return the status the API contract
 * requires.
 */
export async function requireUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const { userId } = await auth();

  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { userId };
}
