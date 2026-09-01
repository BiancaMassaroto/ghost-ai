import {
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasSnapshot,
} from "@/types/canvas";

const NODE_SHAPE_SET = new Set<string>(NODE_SHAPES);
const NODE_COLOR_ID_SET = new Set<string>(NODE_COLORS.map((color) => color.id));

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * A node must carry a real `id`, a numeric `position`, and `data` shaped
 * like `CanvasNodeData` (a known color/shape, per `types/canvas.ts`'s
 * palette) — the fields the canvas renderer and React Flow actually read.
 * Everything else on `Node` (`width`/`height`/`selected`/...) is cosmetic or
 * optional, so it isn't required here.
 */
function isCanvasNode(value: unknown): value is CanvasNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;

  if (typeof node.id !== "string" || node.id.length === 0) return false;

  const position = node.position;
  if (typeof position !== "object" || position === null) return false;
  const { x, y } = position as Record<string, unknown>;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return false;

  const data = node.data;
  if (typeof data !== "object" || data === null) return false;
  const { label, color, shape } = data as Record<string, unknown>;
  if (typeof label !== "string") return false;
  if (typeof color !== "string" || !NODE_COLOR_ID_SET.has(color)) return false;
  if (typeof shape !== "string" || !NODE_SHAPE_SET.has(shape)) return false;

  return true;
}

/**
 * An edge must carry a real `id`, `source`, and `target`; `data` is optional
 * (an edge created via `onConnect` has none until a label is first saved,
 * per `types/canvas.ts`) but when present must carry a string `label`.
 */
function isCanvasEdge(value: unknown): value is CanvasEdge {
  if (typeof value !== "object" || value === null) return false;
  const edge = value as Record<string, unknown>;

  if (typeof edge.id !== "string" || edge.id.length === 0) return false;
  if (typeof edge.source !== "string" || edge.source.length === 0) return false;
  if (typeof edge.target !== "string" || edge.target.length === 0) return false;

  if (edge.data !== undefined) {
    if (typeof edge.data !== "object" || edge.data === null) return false;
    if (typeof (edge.data as Record<string, unknown>).label !== "string") return false;
  }

  return true;
}

/**
 * Validates that an unknown value is a well-formed `CanvasSnapshot` — every
 * node and edge carries the fields the canvas renderer and React Flow
 * actually require, not just "nodes/edges are arrays." Shared by the save
 * route (`app/api/projects/[projectId]/canvas/route.ts`, rejecting a
 * malformed request with a 400 before anything is written) and the load
 * path (`lib/canvas-blob.ts`, treating a corrupt/unreadable blob the same as
 * "nothing saved yet") — the same schema gates both directions, per
 * `code-standards.md`'s "validate unknown external input at system
 * boundaries."
 */
export function isCanvasSnapshot(value: unknown): value is CanvasSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Record<string, unknown>;

  return (
    Array.isArray(snapshot.nodes) &&
    snapshot.nodes.every(isCanvasNode) &&
    Array.isArray(snapshot.edges) &&
    snapshot.edges.every(isCanvasEdge)
  );
}
