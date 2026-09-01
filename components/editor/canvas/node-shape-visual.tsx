import type { NodeShape } from "@/types/canvas";

/** Shapes rendered with plain CSS (border-radius) rather than an SVG outline. */
const CSS_SHAPE_CLASSES: Record<"rectangle" | "pill" | "circle", string> = {
  rectangle: "rounded-lg",
  pill: "rounded-full",
  circle: "rounded-full",
};

function isCssShape(shape: NodeShape): shape is "rectangle" | "pill" | "circle" {
  return shape === "rectangle" || shape === "pill" || shape === "circle";
}

interface NodeShapeVisualProps {
  shape: NodeShape;
  fill: string;
  /** Border/stroke color — subtle at rest, brighter when the node is selected (caller decides which). */
  stroke: string;
}

/**
 * Renders one of the 6 canvas shapes, per `13-node-shape.md`:
 * - `rectangle`/`pill`/`circle` use CSS `border-radius`.
 * - `diamond`/`hexagon`/`cylinder` use an inline SVG outline. The SVG's
 *   `viewBox` is a fixed 0-100 square with `preserveAspectRatio="none"`, so
 *   the shape always stretches to exactly fill the node's actual width and
 *   height (spec: "SVG shapes should scale with node size") instead of
 *   staying a fixed pixel size or preserving its own aspect ratio.
 *
 * Shared by the real node renderer (`canvas-node.tsx`) and the shape-panel
 * drag ghost preview (`shape-drag-preview.tsx`) so both draw the exact same
 * shape from one place rather than duplicating the SVG paths.
 */
export function NodeShapeVisual({ shape, fill, stroke }: NodeShapeVisualProps) {
  if (isCssShape(shape)) {
    return (
      <div
        className={`h-full w-full border ${CSS_SHAPE_CLASSES[shape]}`}
        style={{ backgroundColor: fill, borderColor: stroke }}
      />
    );
  }

  const common = { fill, stroke, strokeWidth: 1.5, strokeLinejoin: "round" as const };

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {shape === "diamond" && <polygon points="50,2 98,50 50,98 2,50" {...common} />}
      {shape === "hexagon" && (
        <polygon points="26,4 74,4 98,50 74,96 26,96 2,50" {...common} />
      )}
      {shape === "cylinder" && (
        <>
          {/* Body sides + front bottom arc; the top edge is left open (an
              implicit fill-closing line) since the ellipse below covers it. */}
          <path d="M2,18 L2,82 A48,14 0 0 0 98,82 L98,18" {...common} />
          <ellipse cx="50" cy="18" rx="48" ry="14" {...common} />
        </>
      )}
    </svg>
  );
}
