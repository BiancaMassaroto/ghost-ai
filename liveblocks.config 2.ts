// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import type { LiveblocksFlow } from "@liveblocks/react-flow";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type { AiChatFeedMessage, AiStatusFeedMessage } from "@/types/tasks";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Cursor position on the canvas; `null` when the pointer isn't over it.
      cursor: { x: number; y: number } | null;
      // Whether this user's AI request is currently generating.
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // `flow` holds the canvas's nodes/edges, synced via
    // `@liveblocks/react-flow`'s `useLiveblocksFlow`, per
    // `11-base-canvas.md`.
    Storage: {
      flow: LiveblocksFlow<CanvasNode, CanvasEdge>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener. Unused —
    // `23-design-agent-logic.md` originally announced AI generation status
    // this way, but `24-ai-presence-state.md` moved that to a real
    // Liveblocks feed instead (`types/tasks.ts`'s `AI_STATUS_FEED_ID`,
    // published via `lib/liveblocks.ts`'s `publishAiStatus`, subscribed to
    // via `useFeedMessages`) — a feed persists its messages and has a
    // purpose-built client hook, unlike a fire-and-forget broadcast event.
    RoomEvent: Record<string, never>;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    // Not defined yet — no comment threads exist.
    ThreadMetadata: Record<string, never>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    // Not defined yet — no room info resolver exists.
    RoomInfo: Record<string, never>;

    // Custom metadata set on a feed (`createFeed`'s `metadata`), for
    // useFeeds, useCreateFeed, etc. Not used — `ai-status-feed` is created
    // with no metadata, per `24-ai-presence-state.md`.
    FeedMetadata: Record<string, never>;

    // Custom payload shape for a feed message, for useFeedMessages,
    // useCreateFeedMessage, etc. Liveblocks types this globally, not
    // per-feed, so this is a union of every feed's message shape:
    // `AiStatusFeedMessage` (`ai-status-feed`, `24-ai-presence-state.md`) and
    // `AiChatFeedMessage` (`ai-chat`, `25-sidebar-chat-feed.md`). Each feed's
    // own hook (`use-ai-status-feed.ts`, `use-ai-chat-feed.ts`) re-validates
    // against its own specific schema before trusting `.data`, since this
    // type alone doesn't say which member a given message actually is.
    FeedMessageData: AiStatusFeedMessage | AiChatFeedMessage;
  }
}

export {};
