"use client";

import { ClientSideSuspense } from "@liveblocks/react";
import { Loader2, WifiOff } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { Canvas } from "@/components/editor/canvas/canvas";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface CanvasRoomProps {
  /** The project's database ID — also the Liveblocks room ID, per the
   * single-identifier decision in `progress-tracker.md`. */
  roomId: string;
  /** Starter templates modal open state, per `18-starter-template.md` — see `Canvas`'s own prop doc for why this is threaded through rather than owned here. */
  isTemplatesModalOpen: boolean;
  onTemplatesModalOpenChange: (open: boolean) => void;
  /** Reports canvas autosave status up to `EditorShell`, per
   * `21-canvas-autosave.md` — see `Canvas`'s own prop doc. */
  onSaveStatusChange: (status: CanvasSaveStatus) => void;
  /** Reports the live canvas graph up to `EditorShell`, so `SpecsTab` can
   * post it to `POST /api/ai/spec` — see `Canvas`'s own prop doc. */
  onCanvasStateChange: (nodes: CanvasNode[], edges: CanvasEdge[], isReady: boolean) => void;
}

/**
 * Renders the real canvas once the room's Storage is ready, per
 * `11-base-canvas.md`. The `LiveblocksProvider`/`RoomProvider` this used to
 * mount itself now live one level up, in `EditorShell` — per
 * `24-ai-presence-state.md`, the AI sidebar (a sibling of this component,
 * not a descendant) needs the same room's presence/feed data, so a single
 * `RoomProvider` now wraps both instead of each Liveblocks consumer mounting
 * its own (see the Architecture Decision in `progress-tracker.md`). This
 * component only owns what's specific to the canvas surface itself: the
 * connection-error fallback and the Storage-loading suspense boundary.
 */
export function CanvasRoom({
  roomId,
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
  onSaveStatusChange,
  onCanvasStateChange,
}: CanvasRoomProps) {
  return (
    // `absolute inset-0` (not `h-full`) — React Flow measures its immediate
    // parent's rendered box directly, and only `inset-0` against the
    // positioned `relative flex-1` ancestor in `editor-shell.tsx` resolves to
    // real pixels; a percentage `height` here would stay indefinite up the
    // flex chain and trigger React Flow's "parent container needs a width
    // and a height" error.
    <div className="absolute inset-0">
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
            roomId={roomId}
            isTemplatesModalOpen={isTemplatesModalOpen}
            onTemplatesModalOpenChange={onTemplatesModalOpenChange}
            onSaveStatusChange={onSaveStatusChange}
            onCanvasStateChange={onCanvasStateChange}
          />
        </ClientSideSuspense>
      </ErrorBoundary>
    </div>
  );
}
