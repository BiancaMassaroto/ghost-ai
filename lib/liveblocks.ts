import { Liveblocks } from "@liveblocks/node";

/**
 * Cached Liveblocks Node client singleton, following the same
 * `globalThis`-caching pattern as `lib/prisma.ts` so Next.js hot reloads in
 * development reuse one client instead of constructing a new one per
 * request, per `10-liveblocks-setup.md`.
 */

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined;
};

function createLiveblocksClient(): Liveblocks {
  return new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
}

export const liveblocks = globalForLiveblocks.liveblocks ?? createLiveblocksClient();

if (process.env.NODE_ENV !== "production") {
  globalForLiveblocks.liveblocks = liveblocks;
}

/**
 * Fixed cursor-color palette — the same vivid, dark-canvas-readable hex
 * values as the node text colors in `context/ui-context.md`'s Node Color
 * Palette, plus the brand accent, so live cursors read as part of the same
 * visual system as the canvas itself.
 */
const CURSOR_COLORS = [
  "#52A8FF", // blue
  "#BF7AF0", // purple
  "#FF990A", // orange
  "#FF6166", // red
  "#F75F8F", // pink
  "#62C073", // green
  "#0AC7B4", // teal
  "#00C8D4", // brand cyan
] as const;

/**
 * Deterministically maps a user ID to a consistent color from
 * `CURSOR_COLORS` — the same user always gets the same cursor color, without
 * needing to store a color assignment anywhere.
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
