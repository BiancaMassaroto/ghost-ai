"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useOthers } from "@liveblocks/react";
import { Panel } from "@xyflow/react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";

/** Beyond this many collaborators, the rest collapse into a "+N" chip. */
const MAX_VISIBLE_COLLABORATORS = 5;

/**
 * Forces this panel's own `<UserButton>` avatar to the same pixel size as
 * `Avatar`'s default (`size-8`, from `components/ui/avatar.tsx`) — Clerk's
 * own default avatar size is otherwise unrelated to it, and the spec calls
 * for the collaborator avatars and the current user's avatar to read as one
 * visually consistent size.
 */
const USER_BUTTON_AVATAR_SIZE_CLASS = "size-8";

function initialFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

/**
 * Top-right presence group inside the canvas view, per
 * `19-presence-avatars-cursor.md`. Deliberately separate from
 * `EditorNavbar` (left untouched) — this only ever mounts inside a
 * Liveblocks room (`CanvasFlow`), so it never appears on the editor home
 * screen. Other participants render as display-only avatars (profile photo,
 * falling back to an initial); the signed-in user renders via their own
 * `<UserButton>` instance here (not the navbar's) so their account
 * menu/sign-out still works from inside the canvas.
 */
export function PresenceAvatars() {
  const { user } = useUser();
  const others = useOthers();

  // `useOthers()` already excludes the local connection, but the spec calls
  // for an explicit filter by Clerk user ID (the `id` `identifyUser` set in
  // `/api/liveblocks-auth`) — also guards against the same account showing
  // up as an "other" via a second tab/session.
  const collaborators = others.filter((other) => other.id !== user?.id);
  const visible = collaborators.slice(0, MAX_VISIBLE_COLLABORATORS);
  const overflowCount = collaborators.length - visible.length;

  return (
    <Panel
      position="top-right"
      className="flex items-center gap-3 rounded-full border border-surface-border bg-surface/95 py-1.5 pr-1.5 pl-2 shadow-lg backdrop-blur-sm"
    >
      {collaborators.length > 0 && (
        <>
          {/* Overlapping stack, per spec — `AvatarGroup`'s own
              `-space-x-2`/ring classes (`components/ui/avatar.tsx`) already
              provide both the overlap and the subtle ring that keeps each
              avatar readable against the dark canvas. */}
          <AvatarGroup>
            {visible.map((other) => (
              <Avatar key={other.connectionId} title={other.info.name}>
                {other.info.avatar && (
                  <AvatarImage src={other.info.avatar} alt={other.info.name} />
                )}
                <AvatarFallback>{initialFor(other.info.name)}</AvatarFallback>
              </Avatar>
            ))}
            {overflowCount > 0 && <AvatarGroupCount>+{overflowCount}</AvatarGroupCount>}
          </AvatarGroup>

          {/* Only rendered when at least one collaborator exists, per spec. */}
          <div className="h-5 w-px bg-surface-border" />
        </>
      )}

      <UserButton
        appearance={{ elements: { userButtonAvatarBox: USER_BUTTON_AVATAR_SIZE_CLASS } }}
      />
    </Panel>
  );
}
