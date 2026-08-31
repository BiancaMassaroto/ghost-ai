import type { Edge, Node } from "@xyflow/react";

/**
 * The 6 node shapes supported on the canvas, per `context/ui-context.md`'s
 * Canvas > Node Shapes section. Complex shapes (diamond, hexagon, cylinder)
 * are rendered as inline SVGs rather than CSS borders — not implemented yet,
 * per `11-base-canvas.md`'s "don't add custom node or edge rendering yet."
 */
export type NodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon";

export const NODE_SHAPES: NodeShape[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
];

/** `rectangle` is the default general-purpose node shape. */
export const DEFAULT_NODE_SHAPE: NodeShape = "rectangle";

/** A node's width/height, in canvas units. */
export interface NodeSize {
  width: number;
  height: number;
}

/**
 * Default size for a newly created node of each shape, per
 * `12-shape-panel.md` — rectangle wider than tall, circle square, diamond
 * sized larger than the others since its rotated bounding box otherwise
 * leaves less room for a centered label. Shape-specific visuals (rendering
 * these as their actual shape rather than a plain rectangle) are deferred to
 * a later unit.
 */
export const DEFAULT_NODE_SIZES: Record<NodeShape, NodeSize> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 180, height: 180 },
  circle: { width: 100, height: 100 },
  pill: { width: 140, height: 60 },
  cylinder: { width: 100, height: 120 },
  hexagon: { width: 150, height: 100 },
};

/**
 * The `dataTransfer` MIME type used for a shape drag, set by `ShapePanel` and
 * read back by the canvas's `drop` handler (`canvas.tsx`), per
 * `12-shape-panel.md`. A custom (non-standard) type, so it doesn't collide
 * with any built-in drag data (plain text, URLs, etc.) a drop target might
 * also read.
 */
export const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-canvas-shape";

/**
 * The payload carried by a shape drag: the shape name and its default size,
 * per `12-shape-panel.md`'s "include the shape name and default size in the
 * drag payload."
 */
export interface ShapeDragPayload {
  shape: NodeShape;
  size: NodeSize;
}

/** Identifiers for the 8 defined node color pairs. */
export type NodeColorId =
  | "neutral"
  | "blue"
  | "purple"
  | "orange"
  | "red"
  | "pink"
  | "green"
  | "teal";

/**
 * One entry in the canvas's node color palette, per `context/ui-context.md`'s
 * Canvas > Node Color Palette section — a dark node fill paired with a vivid
 * text color tuned for readability on the dark canvas.
 */
export interface NodeColor {
  id: NodeColorId;
  fill: string;
  text: string;
}

export const NODE_COLORS: NodeColor[] = [
  { id: "neutral", fill: "#1F1F1F", text: "#EDEDED" },
  { id: "blue", fill: "#10233D", text: "#52A8FF" },
  { id: "purple", fill: "#2E1938", text: "#BF7AF0" },
  { id: "orange", fill: "#331B00", text: "#FF990A" },
  { id: "red", fill: "#3C1618", text: "#FF6166" },
  { id: "pink", fill: "#3A1726", text: "#F75F8F" },
  { id: "green", fill: "#0F2E18", text: "#62C073" },
  { id: "teal", fill: "#062822", text: "#0AC7B4" },
];

/** `neutral` (`#1F1F1F` fill / `#EDEDED` text) is the default node color. */
export const DEFAULT_NODE_COLOR: NodeColorId = "neutral";

/**
 * Data carried by every canvas node, per `11-base-canvas.md`: a label, a
 * palette color, and a shape. `Record<string, unknown>` is satisfied since
 * `label`/`color`/`shape` are all JSON-serializable — required for the data
 * to sync through Liveblocks Storage (`@liveblocks/react-flow`).
 */
export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color: NodeColorId;
  shape: NodeShape;
}

/**
 * A canvas node — a React Flow `Node` typed with `CanvasNodeData` and tagged
 * `"canvasNode"`. No custom node component is registered for this type yet
 * (renders with React Flow's default node), per the scope limits in
 * `11-base-canvas.md`.
 */
export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

/**
 * A canvas edge — a React Flow `Edge` tagged `"canvasEdge"`. No edge data or
 * custom edge component exists yet, per the scope limits in
 * `11-base-canvas.md`.
 */
export type CanvasEdge = Edge<Record<string, never>, "canvasEdge">;
