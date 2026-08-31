"use client";

import "@xyflow/react/dist/style.css";

import { useRef, type DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useLiveblocksFlow } from "@liveblocks/react-flow";

import { CanvasNode as CanvasNodeRenderer } from "@/components/editor/canvas/canvas-node";
import { ShapePanel } from "@/components/editor/canvas/shape-panel";
import { generateNodeId } from "@/lib/canvas-node";
import {
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas";

// Defined at module scope (not inside the component) so its identity is
// stable across renders — React Flow re-registers node types, and warns,
// whenever this object is a fresh reference every render.
const nodeTypes = { canvasNode: CanvasNodeRenderer };

/**
 * The actual React Flow surface. Split out from `Canvas` (below) because
 * `useReactFlow`'s `screenToFlowPosition` — used to place a dropped shape at
 * the right canvas coordinates — only works inside a `ReactFlowProvider`,
 * and `<ReactFlow>` only creates one for its own descendants, not for the
 * component that renders it.
 */
function CanvasFlow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const { screenToFlowPosition } = useReactFlow();
  // Disambiguates nodes dropped within the same millisecond, per
  // `12-shape-panel.md`'s node ID recipe (shape + timestamp + counter).
  const dropCounter = useRef(0);
  // Bounds the canvas viewport so a keyboard/click add can place its node at
  // a defined position (the viewport center) instead of needing pointer
  // coordinates.
  const wrapperRef = useRef<HTMLDivElement>(null);

  function addNode(shape: ShapeDragPayload["shape"], size: ShapeDragPayload["size"], position: { x: number; y: number }) {
    dropCounter.current += 1;

    const newNode: CanvasNode = {
      id: generateNodeId(shape, dropCounter.current),
      type: "canvasNode",
      position,
      width: size.width,
      height: size.height,
      data: { label: "", color: DEFAULT_NODE_COLOR, shape },
    };

    // Adding the node through `onNodesChange` (rather than writing to
    // Liveblocks Storage directly) keeps `useLiveblocksFlow` the single
    // owner of `storage.flow`, per the architecture decision in
    // `progress-tracker.md`.
    onNodesChange([{ type: "add", item: newNode }]);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    // Required for `onDrop` to fire at all — browsers reject a drop on any
    // element whose `dragover` doesn't call `preventDefault()`.
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE);
    if (!raw) return;

    let payload: ShapeDragPayload;
    try {
      payload = JSON.parse(raw) as ShapeDragPayload;
    } catch {
      return;
    }

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addNode(payload.shape, payload.size, position);
  }

  // Non-drag path for `<ShapePanel>`'s buttons — keyboard/click activation
  // has no pointer coordinates to drop at, so the new node lands at the
  // current viewport's center instead.
  function handleAddShape(payload: ShapeDragPayload) {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const center = bounds
      ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
      : { x: 0, y: 0 };

    addNode(payload.shape, payload.size, screenToFlowPosition(center));
  }

  return (
    <ReactFlow
      ref={wrapperRef}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      connectionMode={ConnectionMode.Loose}
      fitView
      colorMode="dark"
      // React Flow's dark `colorMode` paints its own opaque background
      // (`#141414`) on the root element — overridden to transparent so the
      // canvas still sits on `bg-surface` (the workspace card underneath),
      // per `ui-context.md`'s "Canvas sits on the base background color."
      style={{ backgroundColor: "transparent" }}
    >
      <MiniMap />
      {/* Dot color uses the app's own `--border-default` token, not one of
          React Flow's hardcoded defaults, so the pattern stays subtle and
          on-brand against the dark canvas. */}
      <Background variant={BackgroundVariant.Dots} color="var(--border-default)" />
      <ShapePanel onAddShape={handleAddShape} />
    </ReactFlow>
  );
}

/**
 * The collaborative canvas surface: React Flow controlled by Liveblocks
 * Storage via `useLiveblocksFlow`, per `11-base-canvas.md`, now with a
 * draggable shape toolbar (`12-shape-panel.md`) for creating nodes. Renders
 * inside a `ClientSideSuspense` boundary (see `CanvasRoom`), so `suspense:
 * true` is safe here — `nodes`/`edges` are never `null`.
 *
 * Scope limits still in effect: no `Controls`, no shape-specific node
 * visuals (every shape renders as a bordered rectangle for now), no
 * persistence beyond Liveblocks Storage, no AI behavior yet.
 */
export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  );
}
