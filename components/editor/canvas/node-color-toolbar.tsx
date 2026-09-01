"use client";

import type { CSSProperties } from "react";
import { NodeToolbar, Position } from "@xyflow/react";

import { cn } from "@/lib/utils";
import { NODE_COLORS, type NodeColorId } from "@/types/canvas";

interface NodeColorToolbarProps {
  activeColor: NodeColorId;
  onSelect: (color: NodeColorId) => void;
}

/**
 * Floating swatch toolbar shown above a selected node, per
 * `15-nodes-color-toolbar.md`. Built on React Flow's own `NodeToolbar` —
 * it's only rendered while the owning node is selected by default (no
 * `isVisible` override needed, matching "only show it when the node is
 * selected"), doesn't scale with viewport zoom, and its default `Position.Top`
 * + 10px offset already keeps it just above the node without overlapping it.
 *
 * One swatch per `NODE_COLORS` entry. `nodrag`/`nopan`/`nowheel` on the
 * wrapper are React Flow's documented escape hatches for interactive
 * elements rendered inside/above a node — without them, clicking a swatch
 * would also drag the node (or a drag started here would pan the canvas).
 */
export function NodeColorToolbar({ activeColor, onSelect }: NodeColorToolbarProps) {
  return (
    <NodeToolbar
      position={Position.Top}
      align="center"
      className="nodrag nopan nowheel flex items-center gap-1.5 rounded-full border border-surface-border bg-elevated/95 p-1.5 shadow-lg backdrop-blur-sm"
    >
      {NODE_COLORS.map((color) => {
        const isActive = color.id === activeColor;

        return (
          <button
            key={color.id}
            type="button"
            aria-label={`Set node color to ${color.id}`}
            aria-pressed={isActive}
            onClick={() => onSelect(color.id)}
            style={
              {
                backgroundColor: color.fill,
                "--swatch-glow": `${color.text}80`,
              } as CSSProperties
            }
            className={cn(
              "h-6 w-6 shrink-0 rounded-full border-2 transition-transform duration-100",
              "hover:scale-110 hover:shadow-[0_0_6px_1px_var(--swatch-glow)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-elevated",
              isActive ? "scale-110 border-white" : "border-transparent",
            )}
          />
        );
      })}
    </NodeToolbar>
  );
}
