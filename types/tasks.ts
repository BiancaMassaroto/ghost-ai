import { z } from "zod";

/**
 * The Liveblocks feed ID for a room's shared AI status feed, per
 * `24-ai-presence-state.md`. One feed per room (Liveblocks feeds are
 * room-scoped) — every AI-driven background task publishes its status here
 * (`lib/liveblocks.ts`'s `publishAiStatus`), and the AI sidebar subscribes to
 * it (`hooks/use-ai-status-feed.ts`). Shared between server (`lib/`,
 * `trigger/`) and client (`hooks/`) code, so this lives in a plain types
 * module with no server-only imports.
 */
export const AI_STATUS_FEED_ID = "ai-status-feed";

/**
 * Validated payload shape for a message published to the `ai-status-feed`
 * feed. Deliberately generic — not specific to design generation — so a
 * future spec-generation task can publish through the same feed and schema.
 * `status` covers the lifecycle any single generation run goes through;
 * `text` is an optional human-readable line for that step (e.g. a plan
 * summary or error message) — optional per the spec, since not every status
 * necessarily has more to say than the status itself.
 */
export const aiStatusFeedMessageSchema = z.object({
  status: z.enum(["started", "processing", "complete", "error"]),
  text: z.string().optional(),
});

export type AiStatusFeedMessage = z.infer<typeof aiStatusFeedMessageSchema>;

/**
 * The Liveblocks feed ID for a room's shared collaborative chat feed, per
 * `25-sidebar-chat-feed.md`. A separate feed from `AI_STATUS_FEED_ID` above —
 * this one carries only the chat messages people in the room send each
 * other through the AI sidebar's input; it never carries AI progress/status
 * updates, and `ai-status-feed` never carries chat messages. One feed per
 * room, same as `ai-status-feed`.
 */
export const AI_CHAT_FEED_ID = "ai-chat";

/**
 * Validated payload shape for a message published to the `ai-chat` feed.
 * `sender` is the display name of the participant who sent it (mirrors the
 * `userInfo.name` already set at Liveblocks auth time, per
 * `/api/liveblocks-auth`). `role` is carried now so a future AI-generated
 * reply fits the same shape without a schema change, but per this spec's
 * scope every message currently sent is `"user"` — nothing publishes
 * `"assistant"` messages yet. `timestamp` is the client-recorded send time
 * (epoch ms), shown next to each message; ordering for display instead uses
 * the feed message's own `createdAt`, per `hooks/use-ai-chat-feed.ts`.
 */
export const aiChatFeedMessageSchema = z.object({
  sender: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  timestamp: z.number(),
});

export type AiChatFeedMessage = z.infer<typeof aiChatFeedMessageSchema>;
