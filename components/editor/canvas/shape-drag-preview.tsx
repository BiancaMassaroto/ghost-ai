"use client";

import { NodeShapeVisual } from "@/components/editor/canvas/node-shape-visual";
import { DEFAULT_NODE_COLOR, NODE_COLORS, type ShapeDragPayload } from "@/types/canvas";

interface ShapeDragPreviewProps {
  payload: ShapeDragPayload;
  /** Cursor position (`clientX`/`clientY`), tracked by `ShapePanel`. */
  x: number;
  y: number;
}

const previewColor = NODE_COLORS.find((entry) => entry.id === DEFAULT_NODE_COLOR)!;

/**
 * Ghost preview shown while dragging a shape off `ShapePanel`, per
 * `13-node-shape.md`: same shape and default size the drop will actually
 * create, centered on and attached to the cursor. It's a visual-only
 * overlay — not a real node, and it never touches canvas/Liveblocks state.
 *
 * Fixed-positioned, rendered as a sibling of `<Panel>` inside `<ReactFlow>`
 * — that places it outside `.react-flow__viewport` (the pan/zoom-transformed
 * element), so `position: fixed` here resolves against the browser viewport
 * as expected, not the canvas's own transformed coordinate space.
 */
export function ShapeDragPreview({ payload, x, y }: ShapeDragPreviewProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 opacity-70"
      style={{
        left: x - payload.size.width / 2,
        top: y - payload.size.height / 2,
        width: payload.size.width,
        height: payload.size.height,
      }}
    >
      <NodeShapeVisual shape={payload.shape} fill={previewColor.fill} stroke={previewColor.text} />
    </div>
  );
}
