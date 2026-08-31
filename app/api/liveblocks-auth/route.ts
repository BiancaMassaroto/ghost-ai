import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity, checkProjectAccess } from "@/lib/project-access";
import { readJsonBody } from "@/lib/api-request";
import { liveblocks, getUserColor } from "@/lib/liveblocks";

/**
 * POST /api/liveblocks-auth — issues a Liveblocks session (ID token) for the
 * signed-in user. The project ID doubles as the Liveblocks room ID, per
 * `10-liveblocks-setup.md`; `LiveblocksProvider`'s default `authEndpoint`
 * request body shape (`{ room }`) is what's read here.
 *
 * Access is fully gated at issuance: `checkProjectAccess` (the existing
 * owner-or-collaborator helper from `lib/project-access.ts`) must pass
 * before a token for that room is ever handed out, so the room itself can
 * use permissive `defaultAccesses` — anyone holding a valid token for this
 * room ID has already been vetted here, per `architecture-context.md`'s
 * "Liveblocks room tokens are issued only after verifying project
 * membership."
 */
export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;

  const roomId = typeof bodyResult.body.room === "string" ? bodyResult.body.room : "";
  if (!roomId) {
    return NextResponse.json({ error: "room is required" }, { status: 400 });
  }

  const access = await checkProjectAccess(roomId, identity.userId, identity.email);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure the room exists — create only if needed; an existing room's
  // accesses are left untouched.
  await liveblocks.getOrCreateRoom(roomId, {
    defaultAccesses: ["room:write"],
  });

  const { status, body } = await liveblocks.identifyUser(identity.userId, {
    userInfo: {
      name: identity.displayName ?? identity.email ?? "Anonymous",
      avatar: identity.avatarUrl ?? "",
      color: getUserColor(identity.userId),
    },
  });

  return new NextResponse(body, { status });
}
