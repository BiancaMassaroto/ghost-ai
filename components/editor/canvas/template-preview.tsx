import { NODE_COLORS, type CanvasNode, type NodeShape } from "@/types/canvas";
import type { CanvasTemplate } from "@/components/editor/starter-templates";

/** Padding (canvas units) around a template's own node bounds, so shapes don't touch the preview's edge. */
const PREVIEW_PADDING = 16;

function colorFor(colorId: CanvasNode["data"]["color"]) {
  return NODE_COLORS.find((color) => color.id === colorId) ?? NODE_COLORS[0];
}

/**
 * Renders one node's shape as a plain SVG primitive at an arbitrary `x`/`y`/
 * `width`/`height`, in the same fill/stroke pair `NodeShapeVisual` uses for
 * the real canvas node — but self-contained rather than reused from it,
 * since `NodeShapeVisual` draws a single shape filling its own DOM box
 * (`h-full w-full`), not an arbitrarily positioned shape inside one shared
 * multi-node SVG canvas. Keeps this preview lightweight and independent of
 * the real node renderer, per `18-starter-template.md`'s scope limits
 * ("don't change node or edge rendering behavior").
 */
function NodeShapeMark({
  shape,
  x,
  y,
  width,
  height,
  fill,
  stroke,
}: {
  shape: NodeShape;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
}) {
  const common = { fill, stroke, strokeWidth: 1.5 };

  switch (shape) {
    case "rectangle":
      return <rect x={x} y={y} width={width} height={height} rx={8} {...common} />;
    case "pill":
      return <rect x={x} y={y} width={width} height={height} rx={height / 2} {...common} />;
    case "circle":
      return <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} {...common} />;
    case "diamond": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      return <polygon points={`${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`} {...common} />;
    }
    case "hexagon": {
      const cutX = width * 0.26;
      const cy = y + height / 2;
      return (
        <polygon
          points={`${x + cutX},${y} ${x + width - cutX},${y} ${x + width},${cy} ${x + width - cutX},${y + height} ${x + cutX},${y + height} ${x},${cy}`}
          {...common}
        />
      );
    }
    case "cylinder": {
      const rx = width / 2;
      const ry = height * 0.14;
      const cx = x + width / 2;
      return (
        <>
          <path
            d={`M${x},${y + ry} L${x},${y + height - ry} A${rx},${ry} 0 0 0 ${x + width},${y + height - ry} L${x + width},${y + ry}`}
            {...common}
          />
          <ellipse cx={cx} cy={y + ry} rx={rx} ry={ry} {...common} />
        </>
      );
    }
    default:
      return null;
  }
}

/**
 * Computes the bounding box of a template's node positions/sizes, with a
 * fixed padding — per `18-starter-template.md`'s "calculate the preview
 * bounds from the template node positions."
 */
function computeBounds(nodes: CanvasNode[]) {
  const xs = nodes.flatMap((node) => [node.position.x, node.position.x + (node.width ?? 0)]);
  const ys = nodes.flatMap((node) => [node.position.y, node.position.y + (node.height ?? 0)]);

  const minX = Math.min(...xs) - PREVIEW_PADDING;
  const minY = Math.min(...ys) - PREVIEW_PADDING;
  const maxX = Math.max(...xs) + PREVIEW_PADDING;
  const maxY = Math.max(...ys) + PREVIEW_PADDING;

  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

interface TemplatePreviewProps {
  template: CanvasTemplate;
}

/**
 * A lightweight diagram preview for one template card, per
 * `18-starter-template.md` — no React Flow instance, just an SVG whose
 * `viewBox` is the template's own node bounds (so it scales to fit a
 * fixed-size viewport regardless of how spread out the template's layout
 * is), edges drawn as straight lines between node centers, and nodes drawn
 * using their real shape/color data.
 */
export function TemplatePreview({ template }: TemplatePreviewProps) {
  const bounds = computeBounds(template.nodes);
  const nodesById = new Map(template.nodes.map((node) => [node.id, node]));

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-28 w-full rounded-xl border border-surface-border bg-canvas"
      aria-hidden="true"
    >
      {template.edges.map((edge) => {
        const source = nodesById.get(edge.source);
        const target = nodesById.get(edge.target);
        if (!source || !target) return null;

        const x1 = source.position.x + (source.width ?? 0) / 2;
        const y1 = source.position.y + (source.height ?? 0) / 2;
        const x2 = target.position.x + (target.width ?? 0) / 2;
        const y2 = target.position.y + (target.height ?? 0) / 2;

        return <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f8fafc" strokeWidth={1.5} opacity={0.5} />;
      })}

      {template.nodes.map((node) => {
        const color = colorFor(node.data.color);
        return (
          <NodeShapeMark
            key={node.id}
            shape={node.data.shape}
            x={node.position.x}
            y={node.position.y}
            width={node.width ?? 0}
            height={node.height ?? 0}
            fill={color.fill}
            stroke={color.text}
          />
        );
      })}
    </svg>
  );
}
