"use client";

import { useMemo } from "react";
import { useFeedMessages } from "@liveblocks/react";

import { AI_STATUS_FEED_ID, aiStatusFeedMessageSchema, type AiStatusFeedMessage } from "@/types/tasks";

/**
 * Subscribes to the room's shared `ai-status-feed` (per
 * `24-ai-presence-state.md`) and returns only the single most recent
 * message, re-validated against `aiStatusFeedMessageSchema` before it's
 * handed back — a message that fails validation (e.g. a payload from a
 * future, incompatible publisher) is skipped rather than displayed, per the
 * spec's "validate incoming messages before displaying them." Must be called
 * inside a Liveblocks room (a `RoomProvider` ancestor) — see
 * `components/editor/editor-shell.tsx`.
 */
export function useLatestAiStatus(): AiStatusFeedMessage | null {
  const { messages } = useFeedMessages(AI_STATUS_FEED_ID);

  return useMemo(() => {
    if (!messages || messages.length === 0) return null;

    let latest: AiStatusFeedMessage | null = null;
    let latestCreatedAt = -Infinity;

    for (const message of messages) {
      if (message.createdAt <= latestCreatedAt) continue;

      const result = aiStatusFeedMessageSchema.safeParse(message.data);
      if (!result.success) continue;

      latest = result.data;
      latestCreatedAt = message.createdAt;
    }

    return latest;
  }, [messages]);
}
