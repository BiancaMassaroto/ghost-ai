"use client";

import { useState, type DragEvent } from "react";
import { Panel } from "@xyflow/react";
import { Circle, Cylinder, Diamond, Hexagon, Pill, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ShapeDragPreview } from "@/components/editor/canvas/shape-drag-preview";
import {
  DEFAULT_NODE_SIZES,
  NODE_SHAPES,
  SHAPE_DRAG_MIME_TYPE,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas";

interface ShapePanelProps {
  /**
   * Non-drag path for creating a node — called on click (and thus also on
   * keyboard activation of the focused button). Dragging stays the pointer
   * shortcut via `onDragStart` below.
   */
  onAddShape: (payload: ShapeDragPayload) => void;
}

const SHAPE_ICONS: Record<NodeShape, typeof Square> = {
  rectangle: Square,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
};

interface DragPreviewState {
  payload: ShapeDragPayload;
  x: number;
  y: number;
}

/**
 * Floating pill-shaped toolbar of draggable shape buttons, bottom-center of
 * the canvas, per `12-shape-panel.md`. Built on React Flow's own `<Panel>`
 * (the same mechanism `<MiniMap>`/`<Controls>` use to sit above the
 * viewport) rather than a hand-positioned `absolute` element.
 *
 * Dragging a button starts a native HTML drag carrying the shape name and
 * its default size (`DEFAULT_NODE_SIZES`) as JSON in the drag payload;
 * `canvas.tsx`'s `drop` handler reads it back to create the new node. While
 * the drag is in progress, a `ShapeDragPreview` ghost of that same
 * shape/size follows the cursor (`13-node-shape.md`) — purely visual, it
 * doesn't affect what gets created on drop.
 */
export function ShapePanel({ onAddShape }: ShapePanelProps) {
  // Drives the ghost preview (`ShapeDragPreview`) that follows the cursor
  // while a shape is being dragged off this panel, per `13-node-shape.md`.
  // `null` whenever no drag is in progress.
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);

  function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
    const payload: ShapeDragPayload = { shape, size: DEFAULT_NODE_SIZES[shape] };
    event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "copy";
    // Suppress the browser's own default drag ghost (a snapshot of the
    // button) so only the custom shape preview is visible while dragging.
    event.dataTransfer.setDragImage(new Image(), 0, 0);
    setDragPreview({ payload, x: event.clientX, y: event.clientY });
  }

  function handleDrag(event: DragEvent<HTMLButtonElement>) {
    // Browsers fire a final `drag` event with `clientX`/`clientY` both `0`
    // right before `dragend` — ignore it so the preview doesn't jump to the
    // corner for a frame before disappearing.
    if (event.clientX === 0 && event.clientY === 0) return;
    setDragPreview((current) =>
      current ? { ...current, x: event.clientX, y: event.clientY } : current,
    );
  }

  function handleDragEnd() {
    // `dragend` fires whether the drag ended in a successful drop or was
    // cancelled (e.g. dropped outside a valid target, or Escape) — either
    // way, the preview should disappear.
    setDragPreview(null);
  }

  function handleClick(shape: NodeShape) {
    onAddShape({ shape, size: DEFAULT_NODE_SIZES[shape] });
  }

  return (
    <>
      <Panel
        position="bottom-center"
        className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-lg backdrop-blur-sm"
      >
        {NODE_SHAPES.map((shape) => {
          const Icon = SHAPE_ICONS[shape];
          return (
            <Button
              key={shape}
              type="button"
              variant="ghost"
              size="icon"
              draggable
              onDragStart={(event) => handleDragStart(event, shape)}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onClick={() => handleClick(shape)}
              title={shape}
              aria-label={`Add a ${shape} node`}
              className="cursor-grab rounded-full active:cursor-grabbing"
            >
              <Icon />
            </Button>
          );
        })}
      </Panel>

      {dragPreview && (
        <ShapeDragPreview payload={dragPreview.payload} x={dragPreview.x} y={dragPreview.y} />
      )}
    </>
  );
}
