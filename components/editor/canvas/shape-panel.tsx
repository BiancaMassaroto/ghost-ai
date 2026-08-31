"use client";

import type { DragEvent } from "react";
import { Panel } from "@xyflow/react";
import { Circle, Cylinder, Diamond, Hexagon, Pill, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
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

/**
 * Floating pill-shaped toolbar of draggable shape buttons, bottom-center of
 * the canvas, per `12-shape-panel.md`. Built on React Flow's own `<Panel>`
 * (the same mechanism `<MiniMap>`/`<Controls>` use to sit above the
 * viewport) rather than a hand-positioned `absolute` element.
 *
 * Dragging a button starts a native HTML drag carrying the shape name and
 * its default size (`DEFAULT_NODE_SIZES`) as JSON in the drag payload;
 * `canvas.tsx`'s `drop` handler reads it back to create the new node.
 */
export function ShapePanel({ onAddShape }: ShapePanelProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
    const payload: ShapeDragPayload = { shape, size: DEFAULT_NODE_SIZES[shape] };
    event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleClick(shape: NodeShape) {
    onAddShape({ shape, size: DEFAULT_NODE_SIZES[shape] });
  }

  return (
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
  );
}
