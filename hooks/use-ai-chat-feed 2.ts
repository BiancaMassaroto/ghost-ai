"use client";

import { useCallback, useMemo, useState } from "react";
import { useCreateFeedMessage, useFeedMessages, useSelf } from "@liveblocks/react";

import { AI_CHAT_FEED_ID, aiChatFeedMessageSchema, type AiChatFeedMessage } from "@/types/tasks";

/**
 * One validated `ai-chat` message, plus the feed's own message ID and
 * server-assigned `createdAt` (used to order messages — see `messages`
 * below — since the payload's own `timestamp` is client-recorded and only
 * meant for display).
 */
export interface AiChatMessage extends AiChatFeedMessage {
  id: string;
  createdAt: number;
}

interface UseAiChatFeedResult {
  /** Every valid message currently in the feed, oldest first. */
  messages: AiChatMessage[];
  /**
   * Sends `content` as a new chat message. `role` defaults to `"user"` (the
   * current participant's own name, from `useSelf()`); pass `"assistant"` to
   * push a message on the AI's behalf (sender "Ghost AI") — used by
   * `26-design-agent-frontend.md`'s final-message and error-message pushes,
   * per the spec's "show errors as messages in the ai-chat feed."
   */
  sendMessage: (content: string, role?: AiChatFeedMessage["role"]) => Promise<void>;
  /** True while a `sendMessage` call is in flight. */
  isSending: boolean;
  /** Set when the most recent `sendMessage` call failed; cleared on the next attempt. */
  error: string | null;
}

/**
 * Subscribes to the room's shared `ai-chat` feed (per
 * `25-sidebar-chat-feed.md`) and exposes both the validated message list and
 * a `sendMessage` action — the single hook the sidebar chat area (in
 * `components/editor/ai-architect-tab.tsx`) uses for both reading and
 * writing. Kept entirely separate from `hooks/use-ai-status-feed.ts`'s
 * `ai-status-feed` subscription: different feed ID, different schema,
 * different feed instance.
 *
 * Each raw feed message is re-validated against `aiChatFeedMessageSchema`
 * before being handed back — a message that fails validation (e.g. a
 * malformed or future-incompatible payload) is skipped rather than
 * rendered, per the spec's "validate feed messages before rendering them."
 * Must be called inside a Liveblocks room (a `RoomProvider` ancestor) — see
 * `components/editor/editor-shell.tsx`.
 */
export function useAiChatFeed(): UseAiChatFeedResult {
  const { messages: rawMessages } = useFeedMessages(AI_CHAT_FEED_ID);
  const createFeedMessage = useCreateFeedMessage();
  const self = useSelf();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = useMemo(() => {
    if (!rawMessages) return [];

    return rawMessages
      .map((message) => {
        const result = aiChatFeedMessageSchema.safeParse(message.data);
        if (!result.success) return null;
        return { id: message.id, createdAt: message.createdAt, ...result.data };
      })
      .filter((message): message is AiChatMessage => message !== null)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [rawMessages]);

  const sendMessage = useCallback(
    async (content: string, role: AiChatFeedMessage["role"] = "user") => {
      const trimmed = content.trim();
      if (!trimmed) return;

      setError(null);
      setIsSending(true);
      try {
        const payload = aiChatFeedMessageSchema.parse({
          sender: role === "assistant" ? "Ghost AI" : (self?.info.name ?? "Anonymous"),
          role,
          content: trimmed,
          timestamp: Date.now(),
        });
        await createFeedMessage(AI_CHAT_FEED_ID, payload);
      } catch {
        setError("Message failed to send. Try again.");
      } finally {
        setIsSending(false);
      }
    },
    [createFeedMessage, self],
  );

  return { messages, sendMessage, isSending, error };
}
