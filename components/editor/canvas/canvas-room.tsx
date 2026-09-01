"use client";

import { LiveMap, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { Loader2, WifiOff } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Canvas } from "@/components/editor/canvas/canvas";

interface CanvasRoomProps {
  /** The project's database ID — also the Liveblocks room ID, per the
   * single-identifier decision in `progress-tracker.md`. */
  roomId: string;
  /** Starter templates modal open state, per `18-starter-template.md` — see `Canvas`'s own prop doc for why this is threaded through rather than owned here. */
  isTemplatesModalOpen: boolean;
  onTemplatesModalOpenChange: (open: boolean) => void;
}

/**
 * Sets up the Liveblocks room the canvas lives in, per `11-base-canvas.md`:
 * `LiveblocksProvider` authenticates against the existing
 * `/api/liveblocks-auth` route (its default request body, `{ room }`, is
 * exactly what that route reads), `RoomProvider` joins the project's room,
 * and the real canvas only renders once Storage is ready.
 */
export function CanvasRoom({
  roomId,
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
}: CanvasRoomProps) {
  return (
    // `absolute inset-0` (not `h-full`) — React Flow measures its immediate
    // parent's rendered box directly, and only `inset-0` against the
    // positioned `relative flex-1` ancestor in `editor-shell.tsx` resolves to
    // real pixels; a percentage `height` here would stay indefinite up the
    // flex chain and trigger React Flow's "parent container needs a width
    // and a height" error.
    <div className="absolute inset-0">
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider
          id={roomId}
          initialPresence={{ cursor: null, isThinking: false }}
          initialStorage={{
            flow: new LiveObject({ nodes: new LiveMap(), edges: new LiveMap() }),
          }}
        >
          <ErrorBoundary
            fallback={
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                <WifiOff className="h-8 w-8 text-copy-muted" />
                <p className="max-w-sm text-sm text-copy-secondary">
                  Couldn&apos;t connect to the canvas. Check your connection
                  and try reloading.
                </p>
              </div>
            }
          >
            <ClientSideSuspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-copy-muted" />
                </div>
              }
            >
              <Canvas
                isTemplatesModalOpen={isTemplatesModalOpen}
                onTemplatesModalOpenChange={onTemplatesModalOpenChange}
              />
            </ClientSideSuspense>
          </ErrorBoundary>
        </RoomProvider>
      </LiveblocksProvider>
    </div>
  );
}
