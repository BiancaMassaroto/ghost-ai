"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import { NODE_COLORS, type CanvasNode as CanvasNodeType } from "@/types/canvas";

const HANDLE_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;

/**
 * The renderer registered for the `"canvasNode"` type, per
 * `12-shape-panel.md`. For this unit every shape renders identically — a
 * simple bordered rectangle with the label centered — regardless of
 * `data.shape`; shape-specific visuals (diamond/circle/pill/cylinder/hexagon
 * as inline SVGs, per `ui-context.md`'s Node Shapes section) are deferred to
 * a later unit.
 *
 * Handles on all four sides follow `ui-context.md`'s Connection Handles
 * convention (hidden by default, revealed on hover) — needed so the
 * `onConnect` wiring already in `canvas.tsx` has handles to connect.
 */
export function CanvasNode({ data, selected }: NodeProps<CanvasNodeType>) {
  const color = NODE_COLORS.find((entry) => entry.id === data.color) ?? NODE_COLORS[0];

  return (
    <div
      className="group flex h-full w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm"
      style={{
        backgroundColor: color.fill,
        color: color.text,
        borderColor: selected ? color.text : "var(--border-default)",
      }}
    >
      <span className="line-clamp-3 break-words">{data.label}</span>

      {HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          id={position}
          type="source"
          position={position}
          className="!h-2 !w-2 !border-none !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
      ))}
    </div>
  );
}
