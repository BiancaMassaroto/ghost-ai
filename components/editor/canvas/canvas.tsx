"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react";

import { CanvasControlBar } from "@/components/editor/canvas/canvas-control-bar";
import { CanvasEdge as CanvasEdgeRenderer } from "@/components/editor/canvas/canvas-edge";
import {
  CanvasEdgeActionsProvider,
  type CanvasEdgeActions,
} from "@/components/editor/canvas/canvas-edge-context";
import { CanvasNode as CanvasNodeRenderer } from "@/components/editor/canvas/canvas-node";
import {
  CanvasNodeActionsProvider,
  type CanvasNodeActions,
} from "@/components/editor/canvas/canvas-node-context";
import { ShapePanel } from "@/components/editor/canvas/shape-panel";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import { ZOOM_ANIMATION_DURATION_MS, useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { generateNodeId } from "@/lib/canvas-node";
import {
  DEFAULT_NODE_COLOR,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type NodeColorId,
  type ShapeDragPayload,
} from "@/types/canvas";

// Defined at module scope (not inside the component) so its identity is
// stable across renders — React Flow re-registers node/edge types, and
// warns, whenever this object is a fresh reference every render.
const nodeTypes = { canvasNode: CanvasNodeRenderer };
const edgeTypes = { canvasEdge: CanvasEdgeRenderer };

// Applied to every edge that doesn't already specify these fields — i.e.
// every new connection made via `onConnect`, per `16-edge-behavior.md`'s
// "make new connections use the custom canvas edge renderer": React Flow
// fills in unset `Edge` fields (including `type`) from this before an edge
// is ever added, so a freshly drawn connection renders as `CanvasEdge`
// (below) with an arrowhead, with no extra wiring at the point of creation.
const defaultEdgeOptions = {
  type: "canvasEdge" as const,
  style: { stroke: "#f8fafc" },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#f8fafc" },
};

// Below this canvas width, `<CanvasControlBar>` (bottom-left) and
// `<ShapePanel>` (bottom-center) no longer have enough horizontal room to
// sit side by side without touching — both floating pills together are
// roughly 425px wide (5 + 6 icon buttons, their padding/borders, and the
// history-group divider), plus React Flow's own 15px `Panel` margin on each
// side; 640px leaves a comfortable buffer above that. Below it,
// `CanvasControlBar` switches to a stacked bottom-center layout instead
// (see its own doc comment) — separated vertically from `<ShapePanel>`
// rather than horizontally, which holds at any canvas width.
const NARROW_CANVAS_WIDTH_PX = 640;

interface CanvasFlowProps {
  /** Whether the starter templates modal is open — owned by `EditorShell`, threaded down through `CanvasRoom`/`Canvas` since the navbar button that opens it lives outside this component's own tree. */
  isTemplatesModalOpen: boolean;
  onTemplatesModalOpenChange: (open: boolean) => void;
}

/**
 * The actual React Flow surface. Split out from `Canvas` (below) because
 * `useReactFlow`'s `screenToFlowPosition` — used to place a dropped shape at
 * the right canvas coordinates — only works inside a `ReactFlowProvider`,
 * and `<ReactFlow>` only creates one for its own descendants, not for the
 * component that renders it.
 */
function CanvasFlow({ isTemplatesModalOpen, onTemplatesModalOpenChange }: CanvasFlowProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const reactFlowInstance = useReactFlow<CanvasNode, CanvasEdge>();
  const { screenToFlowPosition } = reactFlowInstance;
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Liveblocks' own undo/redo history, per `17-canvas-ergonomics.md` — every
  // mutation on `storage.flow` (node/edge add, move, resize, label/color
  // edits, connect/delete) already goes through `onNodesChange`/
  // `onEdgesChange`, so it's automatically tracked here with no extra wiring.
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  // Disambiguates nodes dropped within the same millisecond, per
  // `12-shape-panel.md`'s node ID recipe (shape + timestamp + counter).
  const dropCounter = useRef(0);
  // Bounds the canvas viewport so a keyboard/click add can place its node at
  // a defined position (the viewport center) instead of needing pointer
  // coordinates. Also observed below for its live width, so the bottom
  // toolbars can switch layout once there's no longer room for both side by
  // side (e.g. with both the project and AI sidebars open).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setCanvasWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isCanvasNarrow = canvasWidth !== null && canvasWidth < NARROW_CANVAS_WIDTH_PX;

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

  // Replaces the current canvas with a starter template, per
  // `18-starter-template.md`: every existing node/edge is removed first,
  // then the template's own nodes/edges are added — both through the same
  // `onNodesChange`/`onEdgesChange` controlled path every other canvas
  // mutation uses, so the clear-then-import lands in Liveblocks Storage (and
  // is undo/redo-able) like any other change, not a separate code path.
  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      onNodesChange([
        ...nodes.map((node) => ({ type: "remove" as const, id: node.id })),
        ...template.nodes.map((item) => ({ type: "add" as const, item })),
      ]);
      onEdgesChange([
        ...edges.map((edge) => ({ type: "remove" as const, id: edge.id })),
        ...template.edges.map((item) => ({ type: "add" as const, item })),
      ]);

      // `fitView` reads React Flow's internal store, which only syncs with
      // the new `nodes`/`edges` props after this render commits — deferred a
      // tick so it fits the template that was just imported, not whatever
      // was on the canvas a moment ago.
      requestAnimationFrame(() => {
        reactFlowInstance.fitView({ duration: ZOOM_ANIMATION_DURATION_MS });
      });
    },
    [nodes, edges, onNodesChange, onEdgesChange, reactFlowInstance],
  );

  // Updates a node's label in place, per `14-node-editing.md`. Constructs a
  // real `NodeReplaceChange` (rather than calling e.g. `useReactFlow`'s own
  // `updateNodeData`, which would write to React Flow's internal store and
  // never reach Liveblocks) and dispatches it through the same controlled
  // `onNodesChange` every other node mutation goes through — the existing
  // "storage.flow is only ever written to via onNodesChange" invariant.
  const updateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      const target = nodesRef.current.find((node) => node.id === nodeId);
      if (!target) return;

      onNodesChange([
        { type: "replace", id: nodeId, item: { ...target, data: { ...target.data, label } } },
      ]);
    },
    [onNodesChange],
  );

  // Updates a node's color pair (background + text), per
  // `15-nodes-color-toolbar.md`'s floating color toolbar. Same
  // `NodeReplaceChange`-through-`onNodesChange` pattern as `updateNodeLabel`
  // above — `data.color` alone is replaced, `CanvasNode`'s renderer already
  // derives both the fill and the paired text color from it via
  // `NODE_COLORS`, so nothing else needs updating for the node to reflect
  // the new pair immediately.
  const updateNodeColor = useCallback(
    (nodeId: string, color: NodeColorId) => {
      const target = nodesRef.current.find((node) => node.id === nodeId);
      if (!target) return;

      onNodesChange([
        { type: "replace", id: nodeId, item: { ...target, data: { ...target.data, color } } },
      ]);
    },
    [onNodesChange],
  );

  const nodeActions = useMemo<CanvasNodeActions>(
    () => ({ updateNodeLabel, updateNodeColor }),
    [updateNodeLabel, updateNodeColor],
  );

  // Updates an edge's label, per `16-edge-behavior.md`'s inline edge label
  // editing. Same `*ReplaceChange`-through-`on*Change` pattern as the node
  // actions above, just for edges/`onEdgesChange` — `data` may be `undefined`
  // on an edge that's never had a label saved (created via `onConnect`
  // without one), hence the spread of a possibly-undefined value.
  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      const target = edgesRef.current.find((edge) => edge.id === edgeId);
      if (!target) return;

      onEdgesChange([
        { type: "replace", id: edgeId, item: { ...target, data: { ...target.data, label } } },
      ]);
    },
    [onEdgesChange],
  );

  const edgeActions = useMemo<CanvasEdgeActions>(() => ({ updateEdgeLabel }), [updateEdgeLabel]);

  // Keyboard equivalents of the control bar's zoom/undo/redo buttons, per
  // `17-canvas-ergonomics.md` — same `reactFlowInstance`/`undo`/`redo` calls,
  // so both paths stay in sync automatically.
  useKeyboardShortcuts({ reactFlowInstance, undo, redo });

  return (
    <CanvasNodeActionsProvider value={nodeActions}>
      <CanvasEdgeActionsProvider value={edgeActions}>
        <ReactFlow
          ref={wrapperRef}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
          // Every new connection defaults to the custom `canvasEdge` type,
          // the app's edge color, and an arrowhead — see the module-scope
          // comment on `defaultEdgeOptions` above.
          defaultEdgeOptions={defaultEdgeOptions}
        >
          {/* Dot color uses the app's own `--border-default` token, not one of
              React Flow's hardcoded defaults, so the pattern stays subtle and
              on-brand against the dark canvas. */}
          <Background variant={BackgroundVariant.Dots} color="var(--border-default)" />
          <ShapePanel onAddShape={handleAddShape} />
          {/* Bottom-left, per `17-canvas-ergonomics.md` — the minimap this
              replaced (previously bottom-right) has been removed. Switches
              to a stacked bottom-center layout (see its own doc comment)
              once `isCanvasNarrow` says there's no longer room next to
              `<ShapePanel>`. */}
          <CanvasControlBar
            reactFlowInstance={reactFlowInstance}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            isNarrow={isCanvasNarrow}
          />
        </ReactFlow>

        <StarterTemplatesModal
          open={isTemplatesModalOpen}
          onOpenChange={onTemplatesModalOpenChange}
          onImport={handleImportTemplate}
        />
      </CanvasEdgeActionsProvider>
    </CanvasNodeActionsProvider>
  );
}

interface CanvasProps {
  /**
   * Starter templates modal open state, per `18-starter-template.md` —
   * owned by `EditorShell` (the navbar button that opens it lives outside
   * this whole component tree) and threaded down through `CanvasRoom` since
   * the actual import needs `CanvasFlow`'s own `nodes`/`edges`/
   * `onNodesChange`/`onEdgesChange`/`reactFlowInstance`.
   */
  isTemplatesModalOpen: boolean;
  onTemplatesModalOpenChange: (open: boolean) => void;
}

/**
 * The collaborative canvas surface: React Flow controlled by Liveblocks
 * Storage via `useLiveblocksFlow`, per `11-base-canvas.md`, now with a
 * draggable shape toolbar (`12-shape-panel.md`) for creating nodes. Renders
 * inside a `ClientSideSuspense` boundary (see `CanvasRoom`), so `suspense:
 * true` is safe here — `nodes`/`edges` are never `null`.
 */
export function Canvas({ isTemplatesModalOpen, onTemplatesModalOpenChange }: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasFlow
        isTemplatesModalOpen={isTemplatesModalOpen}
        onTemplatesModalOpenChange={onTemplatesModalOpenChange}
      />
    </ReactFlowProvider>
  );
}
