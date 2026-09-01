"use client";

import { useOthers } from "@liveblocks/react";
import { ViewportPortal } from "@xyflow/react";
import { MousePointer2 } from "lucide-react";

/**
 * Renders every other participant's live cursor, per
 * `19-presence-avatars-cursor.md` — never the current user's own. Rendered
 * inside `<ViewportPortal>`, React Flow's own primitive for content that
 * shares the canvas's coordinate system: `CanvasFlow`'s `onMouseMove` (in
 * `canvas.tsx`) broadcasts each cursor's position already converted to flow
 * coordinates (via `screenToFlowPosition`, the same conversion the shape
 * drop handler already uses), so a cursor pans/zooms with the canvas
 * content exactly like a node position would, regardless of the viewer's
 * own pan/zoom state.
 */
export function LiveCursors() {
  const others = useOthers();

  return (
    <ViewportPortal>
      {others.map((other) => {
        const cursor = other.presence.cursor;
        if (!cursor) return null;

        return (
          <div
            key={other.connectionId}
            className="pointer-events-none absolute top-0 left-0 z-50 flex items-center gap-1.5"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <MousePointer2
              className="h-4 w-4 drop-shadow"
              style={{ color: other.info.color, fill: other.info.color }}
            />
            <span
              className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-copy-primary shadow"
              style={{ backgroundColor: other.info.color }}
            >
              {other.info.name}
            </span>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
