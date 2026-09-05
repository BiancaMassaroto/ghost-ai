import { Liveblocks } from "@liveblocks/node";

import { AI_CHAT_FEED_ID, AI_STATUS_FEED_ID, aiStatusFeedMessageSchema, type AiStatusFeedMessage } from "@/types/tasks";

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

/**
 * The design agent's fixed Liveblocks identity, per `23-design-agent-logic.md`
 * — it has no Clerk account, so unlike a real collaborator's presence
 * (`getUserColor` above), its `userId`/`userInfo` are constants rather than
 * derived. `color` reuses `--accent-ai` (`context/ui-context.md`'s existing
 * "AI accent" token), not a new invented color, so the agent's cursor/avatar
 * reads as part of the same AI-branded visual language as the rest of the
 * app (already used by the AI sidebar).
 */
export const AI_AGENT_USER_ID = "ghost-ai-agent";
export const AI_AGENT_USER_INFO = { name: "Ghost AI", avatar: "", color: "#6457f9" };

/** One RFC 6902 JSON Patch operation, as accepted by Liveblocks' storage patch endpoint. */
export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
}

/**
 * Escapes a single JSON Pointer (RFC 6901) path segment — required before
 * splicing an externally-sourced value (e.g. a node/edge ID an AI model
 * generated) into a `JsonPatchOperation`'s `path`, since `~` and `/` are
 * structural characters in a pointer and would otherwise corrupt the path.
 */
export function jsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Applies a batch of JSON Patch operations to a room's Storage document over
 * Liveblocks' REST API — the officially documented way for a backend agent
 * to write structured updates into Storage
 * (https://liveblocks.io/docs/guides/enabling-agentic-workflows-with-liveblocks),
 * used instead of the Node SDK's `mutateStorage` because building the exact
 * Live-structure shape `@liveblocks/react-flow` expects for a node/edge by
 * hand (which fields stay plain vs. become nested `LiveObject`s) isn't
 * documented and isn't worth the risk of getting subtly wrong; JSON Patch
 * writes plain JSON and lets Liveblocks convert it. The installed
 * `@liveblocks/node@3.24.1` has no typed wrapper for this endpoint yet (see
 * the Architecture Decision in `progress-tracker.md`), so this calls it
 * directly. All operations in `operations` are applied atomically — per
 * Liveblocks' docs, if any operation fails, the whole patch is rejected and
 * the document is left unchanged.
 */
export async function patchRoomStorage(
  roomId: string,
  operations: JsonPatchOperation[],
): Promise<void> {
  if (operations.length === 0) return;

  const response = await fetch(
    `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}/storage/json-patch`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(operations),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Liveblocks storage patch failed (${response.status}): ${body}`);
  }
}

/**
 * Ensures a room-scoped Liveblocks feed exists — "create or reuse,"
 * mirroring `getOrCreateRoom`'s own idiom already used in
 * `/api/liveblocks-auth` (create only if missing, leave an existing feed
 * untouched). Checks first rather than assuming a create call is cheap or
 * that a duplicate-create always fails with a specific status code
 * (undocumented for feeds); the common case after the first call is a
 * single `getFeed` lookup. Shared by `ensureAiStatusFeed` and
 * `ensureAiChatFeed` below, since both feeds need the exact same
 * check-then-create logic.
 */
async function ensureFeed(roomId: string, feedId: string): Promise<void> {
  try {
    await liveblocks.getFeed({ roomId, feedId });
    return;
  } catch {
    // Not found (or a transient read error) — fall through and create it.
  }

  try {
    await liveblocks.createFeed({ roomId, feedId });
  } catch {
    // A concurrent caller (another room-join, or a retried task run) may
    // have created it in between the two calls above — confirm before
    // letting the error propagate.
    await liveblocks.getFeed({ roomId, feedId });
  }
}

/**
 * Ensures the room's shared AI status feed (`ai-status-feed`, per
 * `24-ai-presence-state.md`) exists. Called both at room-join time
 * (`/api/liveblocks-auth`) — so a client's
 * `useFeedMessages(AI_STATUS_FEED_ID)` subscription never has to race the
 * feed not existing yet — and defensively inside `publishAiStatus` below, so
 * publishing doesn't depend on that call having already happened.
 */
export async function ensureAiStatusFeed(roomId: string): Promise<void> {
  await ensureFeed(roomId, AI_STATUS_FEED_ID);
}

/**
 * Ensures the room's shared collaborative chat feed (`ai-chat`, per
 * `25-sidebar-chat-feed.md`) exists. Called at room-join time
 * (`/api/liveblocks-auth`), same as `ensureAiStatusFeed` above, so the AI
 * sidebar's `useFeedMessages(AI_CHAT_FEED_ID)` subscription (via
 * `hooks/use-ai-chat-feed.ts`) never has to race the feed not existing yet.
 * Unlike `ai-status-feed`, nothing publishes to `ai-chat` from the backend —
 * messages are sent directly by clients via `useCreateFeedMessage`, per this
 * spec's "use the existing sidebar input and send button" — so there's no
 * corresponding `publishAiChatMessage` server-side helper.
 */
export async function ensureAiChatFeed(roomId: string): Promise<void> {
  await ensureFeed(roomId, AI_CHAT_FEED_ID);
}

/**
 * Publishes one message to the room's `ai-status-feed`, per
 * `24-ai-presence-state.md`. `message` is re-validated against
 * `aiStatusFeedMessageSchema` (`types/tasks.ts`) here, at the single point
 * every publisher (currently just `trigger/design-agent.ts`, later spec
 * generation too) funnels through, rather than trusting each caller's own
 * TypeScript types alone.
 */
export async function publishAiStatus(
  roomId: string,
  message: AiStatusFeedMessage,
): Promise<void> {
  await ensureAiStatusFeed(roomId);
  await liveblocks.createFeedMessage({
    roomId,
    feedId: AI_STATUS_FEED_ID,
    data: aiStatusFeedMessageSchema.parse(message),
  });
}
