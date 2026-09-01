"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

import { useCanvasEdgeActions } from "@/components/editor/canvas/canvas-edge-context";
import type { CanvasEdge as CanvasEdgeType } from "@/types/canvas";

/** Matches `defaultEdgeOptions.style.stroke` in `canvas.tsx` — the fallback if a specific edge has no inline style. */
const DEFAULT_STROKE = "#f8fafc";
/** Thin — edges stay visually secondary to nodes, per `ui-context.md`'s Edge Style section. */
const STROKE_WIDTH = 1.5;
/**
 * A much wider, invisible path stacked on top of the visible one — this is
 * what actually receives hover/click/double-click, so the hit area is easy
 * to hit without making the rendered line itself any thicker.
 */
const HIT_STROKE_WIDTH = 24;

const LABEL_HINT = "Add label";

/**
 * The renderer registered for the `"canvasEdge"` type, per
 * `16-edge-behavior.md`. Replaces React Flow's default edge (used for every
 * edge so far, since no `edgeTypes` entry existed before this unit).
 *
 * Routing/label position: `getSmoothStepPath` gives clean right-angle
 * routing plus the label's midpoint coordinates directly (`labelX`/`labelY`)
 * — used both for the arrow-tipped path and, via `EdgeLabelRenderer`, for
 * positioning the label pill/input, per the spec's explicit instruction not
 * to calculate the midpoint manually.
 *
 * Hover/selection: a wide transparent path (`HIT_STROKE_WIDTH`) stacked on
 * top of the thin visible one owns all pointer events, so the edge is easy
 * to hover/click/double-click without the visible line getting any thicker.
 * The visible path dims to `opacity-60` at rest and brightens to full
 * opacity on hover or selection.
 *
 * Label editing: double-clicking the edge (or an existing label) opens a
 * local-draft `<input>` (not live-typed like node label editing — the value
 * only reaches `updateEdgeLabel`, and thus `onEdgesChange`, on blur/Enter/
 * Escape, per spec). The input's `size` grows with its own value so it
 * visually grows with the typed text. A saved label renders as a small pill
 * badge; an edge with no label shows a faint hint only while hovered/
 * selected, so an edge at rest stays uncluttered. `nodrag nopan nowheel` on
 * the label's wrapper are React Flow's documented escape hatches (already
 * used the same way for the node color toolbar and node label editing) so
 * clicking/typing in the label never drags a node or pans/zooms the canvas.
 */
export function CanvasEdge({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps<CanvasEdgeType>) {
  const { updateEdgeLabel } = useCanvasEdgeActions();
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus (and select existing text) the moment editing opens, mirroring
  // `CanvasNode`'s label-editing textarea.
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const label = data?.label ?? "";
  const isActive = isHovered || selected || isEditing;

  function openEditor() {
    setDraft(label);
    setIsEditing(true);
  }

  function handleLabelDoubleClick(event: ReactMouseEvent) {
    // Otherwise a double-click here would also bubble to the pane/canvas.
    event.stopPropagation();
    openEditor();
  }

  function commitAndClose() {
    updateEdgeLabel(id, draft.trim());
    setIsEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Blurring closes editing (see the input's `onBlur` below), which is
    // also where the save happens — Enter and Escape both just need to
    // trigger that, per spec's "save the label on blur, Enter, or Escape."
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <>
      {/* Wide invisible path — owns hover/click/double-click so the hit
          area is generous without the visible path (below) getting thicker. */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={HIT_STROKE_WIDTH}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={handleLabelDoubleClick}
      />
      <path
        d={path}
        fill="none"
        stroke={style?.stroke ?? DEFAULT_STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        markerEnd={markerEnd}
        style={{ pointerEvents: "none", opacity: isActive ? 1 : 0.6, transition: "opacity 120ms ease" }}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan nowheel absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onDoubleClick={handleLabelDoubleClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
              onBlur={commitAndClose}
              onKeyDown={handleKeyDown}
              placeholder={LABEL_HINT}
              size={Math.max(draft.length, 1)}
              className="rounded-full border border-surface-border bg-elevated px-2.5 py-1 text-center text-xs text-copy-primary outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          ) : label ? (
            <span className="rounded-full border border-surface-border bg-elevated px-2.5 py-1 text-xs whitespace-nowrap text-copy-primary shadow-sm">
              {label}
            </span>
          ) : isActive ? (
            <span className="rounded-full border border-dashed border-surface-border px-2.5 py-1 text-xs whitespace-nowrap text-copy-faint">
              {LABEL_HINT}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
