"use client";

import { useOthers } from "@liveblocks/react";

/**
 * Whether AI generation is currently active in this room, per
 * `24-ai-presence-state.md` — true whenever any other participant's
 * presence has `thinking: true` (in practice, only the design agent's
 * synthetic presence ever sets this; see `trigger/design-agent.ts`'s
 * `setAiPresence`). Shared state, not derived from anything local, so it
 * reads the same for every participant in the room. Uses `useOthers`'s
 * selector overload (per the `performant-others-and-presence` best
 * practice) so this only re-renders when the boolean itself flips, not on
 * every unrelated presence update (e.g. a cursor move). Must be called
 * inside a Liveblocks room — see `components/editor/editor-shell.tsx`.
 */
export function useIsAiThinking(): boolean {
  return useOthers((others) => others.some((other) => other.presence.thinking === true));
}
