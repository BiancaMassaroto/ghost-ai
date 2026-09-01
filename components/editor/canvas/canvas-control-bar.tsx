"use client";

import { Panel } from "@xyflow/react";
import { Maximize2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ZOOM_ANIMATION_DURATION_MS } from "@/hooks/use-keyboard-shortcuts";

/**
 * The three `ReactFlowInstance` viewport methods this component calls.
 * Written out by hand (rather than `Pick<ReactFlowInstance, ...>`) because
 * `fitView`'s real type is parameterized by the instance's node type
 * (`ReactFlowInstance<CanvasNode, CanvasEdge>`, per `canvas.tsx`) — a
 * `Pick` would carry that generic along and make this component depend on
 * `CanvasNode`/`CanvasEdge` just to type a prop it only ever calls with a
 * `duration`.
 */
interface ZoomViewportHelpers {
  zoomIn: (options?: { duration?: number }) => void;
  zoomOut: (options?: { duration?: number }) => void;
  fitView: (options?: { duration?: number }) => void;
}

interface CanvasControlBarProps {
  /** Drives the zoom group directly, same instance `useKeyboardShortcuts` uses. */
  reactFlowInstance: ZoomViewportHelpers;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /**
   * Whether the canvas is currently too narrow for this bar and
   * `<ShapePanel>` to sit side by side without touching (computed in
   * `canvas.tsx` from the canvas's live width via `ResizeObserver`). Swaps
   * this bar from its normal bottom-left position to stacked bottom-center,
   * directly above `<ShapePanel>`.
   */
  isNarrow: boolean;
}

/**
 * Floating pill-shaped control bar, bottom-left of the canvas by default.
 * Two groups — zoom out / fit view / zoom in, then undo / redo — separated
 * by a thin divider. Built on React Flow's own `<Panel>` (the same
 * primitive `<ShapePanel>` uses, per `12-shape-panel.md`) rather than a
 * hand-positioned `absolute` element, and mirrors its pill styling for
 * visual consistency.
 *
 * React Flow's default `Panel` margin (`15px`) puts every `bottom-*`
 * position at the same height from the canvas edge, so `bottom-left` and
 * `<ShapePanel>`'s `bottom-center` only avoid overlapping by being far
 * enough apart *horizontally* — which breaks once the canvas narrows too
 * far (e.g. with both the project and AI sidebars open). When `isNarrow` is
 * true, this bar switches to `bottom-center` too, stacked directly above
 * `<ShapePanel>` via the `marginBottom` override below — separated
 * vertically instead, which holds at any canvas width — rather than
 * changing `<ShapePanel>` itself, per `17-canvas-ergonomics.md`'s "don't
 * change the shape panel."
 *
 * The keyboard shortcuts in `hooks/use-keyboard-shortcuts.ts` trigger the
 * exact same `reactFlowInstance`/`undo`/`redo` calls as these buttons, so
 * both paths stay in sync automatically.
 */
export function CanvasControlBar({
  reactFlowInstance,
  undo,
  redo,
  canUndo,
  canRedo,
  isNarrow,
}: CanvasControlBarProps) {
  return (
    <Panel
      position={isNarrow ? "bottom-center" : "bottom-left"}
      // Overrides React Flow's own default `margin: 15px` bottom offset
      // (same on every `bottom-*` position) so this panel clears
      // `<ShapePanel>`'s ~46px pill height (15px margin + ~44px content)
      // plus a visible gap, instead of sitting at the same height as it —
      // only needed once stacked; at `bottom-left` the default margin is
      // exactly what already looked right before.
      style={isNarrow ? { marginBottom: "5rem" } : undefined}
      className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-lg backdrop-blur-sm"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => reactFlowInstance.zoomOut({ duration: ZOOM_ANIMATION_DURATION_MS })}
        title="Zoom out"
        aria-label="Zoom out"
        className="rounded-full"
      >
        <ZoomOut />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => reactFlowInstance.fitView({ duration: ZOOM_ANIMATION_DURATION_MS })}
        title="Fit view"
        aria-label="Fit view"
        className="rounded-full"
      >
        <Maximize2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => reactFlowInstance.zoomIn({ duration: ZOOM_ANIMATION_DURATION_MS })}
        title="Zoom in"
        aria-label="Zoom in"
        className="rounded-full"
      >
        <ZoomIn />
      </Button>

      {/* Divider between the zoom and history groups. */}
      <div className="mx-1 h-5 w-px bg-surface-border" aria-hidden="true" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={undo}
        disabled={!canUndo}
        title="Undo"
        aria-label="Undo"
        className="rounded-full"
      >
        <Undo2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={redo}
        disabled={!canRedo}
        title="Redo"
        aria-label="Redo"
        className="rounded-full"
      >
        <Redo2 />
      </Button>
    </Panel>
  );
}
