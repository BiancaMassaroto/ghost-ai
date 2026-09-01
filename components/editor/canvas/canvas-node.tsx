"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";

import { useCanvasNodeActions } from "@/components/editor/canvas/canvas-node-context";
import { NodeColorToolbar } from "@/components/editor/canvas/node-color-toolbar";
import { NodeShapeVisual } from "@/components/editor/canvas/node-shape-visual";
import {
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_COLORS,
  type CanvasNode as CanvasNodeType,
} from "@/types/canvas";

const HANDLE_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;

const LABEL_PLACEHOLDER = "Label";

/**
 * The renderer registered for the `"canvasNode"` type. Per `13-node-shape.md`
 * each node now renders its actual `data.shape` — `NodeShapeVisual` handles
 * the CSS-vs-SVG split — instead of always drawing a plain bordered
 * rectangle (the `12-shape-panel.md` placeholder this replaces).
 *
 * The border/stroke color stays subtle at rest (`--border-default`) and
 * switches to the node's own text color when selected, so a selected node's
 * outline reads as "brighter," not just a different color.
 *
 * Handles on all four sides follow `ui-context.md`'s Connection Handles
 * convention (small white dots with a dark border, hidden by default,
 * revealed on hover). Every handle is `type="source"`, and `canvas.tsx` runs
 * `connectionMode={ConnectionMode.Loose}` — Loose mode allows source-to-source
 * connections (not just source-to-target), so any handle can connect to any
 * other handle, per `16-edge-behavior.md`.
 *
 * `14-node-editing.md` adds two more selected-node interactions:
 * - `NodeResizer` (React Flow's built-in resize UI) shows corner/edge handles
 *   whenever the node is selected, floored at `MIN_NODE_WIDTH`/`MIN_NODE_HEIGHT`.
 *   Its drag updates dimensions through the same `triggerNodeChanges` path a
 *   controlled `<ReactFlow nodes edges onNodesChange>` already uses for every
 *   other node change, so resizing stays synced through `useLiveblocksFlow`
 *   with no extra wiring here.
 * - Double-clicking the node opens inline label editing: a `<textarea>`
 *   absolutely positioned over the same centered spot the static label
 *   renders in, so switching between the two causes no layout shift. Typing
 *   calls `updateNodeLabel` (from `CanvasNodeActionsContext`, provided by
 *   `CanvasFlow` in `canvas.tsx`) so the label update is dispatched through
 *   `onNodesChange` too, per the same storage-ownership invariant.
 *
 * `15-nodes-color-toolbar.md` adds a floating `NodeColorToolbar` above the
 * node (only rendered while selected, per React Flow's own `NodeToolbar`
 * default) — picking a swatch calls `updateNodeColor` the same way label
 * edits call `updateNodeLabel`, so the node's fill/text update immediately
 * and stay synced through `onNodesChange`.
 */
export function CanvasNode({ id, data, selected }: NodeProps<CanvasNodeType>) {
  const color = NODE_COLORS.find((entry) => entry.id === data.color) ?? NODE_COLORS[0];
  const borderColor = selected ? color.text : "var(--border-default)";
  const { updateNodeLabel, updateNodeColor } = useCanvasNodeActions();

  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus (and select existing text) the moment editing opens, so the
  // double-click that triggered it drops the user straight into typing.
  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  function handleLabelChange(event: ChangeEvent<HTMLTextAreaElement>) {
    updateNodeLabel(id, event.target.value);
  }

  function handleLabelKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Blurring closes editing (see the textarea's `onBlur` below) — Escape
    // just needs to trigger that, not insert a newline or bubble further.
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <div className="group relative h-full w-full" onDoubleClick={() => setIsEditing(true)}>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_WIDTH}
        minHeight={MIN_NODE_HEIGHT}
        color="var(--accent-primary)"
        handleClassName="!h-2 !w-2 !rounded-[2px] !border-none"
      />

      <NodeColorToolbar
        activeColor={data.color}
        onSelect={(nextColor) => updateNodeColor(id, nextColor)}
      />

      <NodeShapeVisual shape={data.shape} fill={color.fill} stroke={borderColor} />

      {isEditing ? (
        // A plain `absolute inset-0` textarea vertically anchors its text to
        // the top (textareas don't center their own content) — this wrapper
        // is `flex items-center`, matching the static label `<div>` below,
        // so the box centers vertically the same way. `rows={2}` keeps the
        // textarea's own height stable while editing (no layout shift from
        // growing with typed content); `max-h-full` + `overflow-hidden`
        // clamp it to the node's bounds if a smaller/resized node can't fit
        // two rows.
        <div className="absolute inset-0 flex items-center justify-center px-3 py-2">
          <textarea
            ref={textareaRef}
            value={data.label}
            onChange={handleLabelChange}
            onKeyDown={handleLabelKeyDown}
            onBlur={() => setIsEditing(false)}
            placeholder={LABEL_PLACEHOLDER}
            rows={2}
            // `nodrag`/`nopan`/`nowheel` are React Flow's documented escape
            // hatches for interactive elements inside a node — without them,
            // a click-drag or scroll started on the textarea would drag the
            // node or pan/zoom the canvas instead of editing text.
            className="nodrag nopan nowheel w-full max-h-full resize-none overflow-hidden bg-transparent text-center text-sm outline-none placeholder:text-copy-faint"
            style={{ color: color.text }}
          />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 py-2 text-center text-sm"
          style={{ color: data.label ? color.text : undefined }}
        >
          <span className={`line-clamp-3 break-words ${data.label ? "" : "text-copy-faint"}`}>
            {data.label || LABEL_PLACEHOLDER}
          </span>
        </div>
      )}

      {HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          id={position}
          type="source"
          position={position}
          className="!h-2 !w-2 !border !border-canvas !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
      ))}
    </div>
  );
}
