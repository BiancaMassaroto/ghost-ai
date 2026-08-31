// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import type { LiveblocksFlow } from "@liveblocks/react-flow";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Cursor position on the canvas; `null` when the pointer isn't over it.
      cursor: { x: number; y: number } | null;
      // Whether this user's AI request is currently generating.
      isThinking: boolean;
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

    // Custom events, for useBroadcastEvent, useEventListener
    // Not defined yet — no room events exist.
    RoomEvent: Record<string, never>;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    // Not defined yet — no comment threads exist.
    ThreadMetadata: Record<string, never>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    // Not defined yet — no room info resolver exists.
    RoomInfo: Record<string, never>;
  }
}

export {};
