"use client";

import { createContext, useContext } from "react";

import type { NodeColorId } from "@/types/canvas";

/**
 * Actions a `CanvasNode` renderer can trigger on itself. Provided by
 * `CanvasFlow` (`canvas.tsx`) so the actual mutation still goes through
 * `useLiveblocksFlow`'s `onNodesChange` — per the architecture decision that
 * `storage.flow` is only ever written to that way, never directly. A node
 * renderer has no access to `onNodesChange` on its own (it only receives
 * `NodeProps`), so this context is how it reaches it. Added for
 * `14-node-editing.md`'s inline label editing.
 */
export interface CanvasNodeActions {
  /** Replaces a node's label via a real `NodeReplaceChange`, dispatched through `onNodesChange`. */
  updateNodeLabel: (nodeId: string, label: string) => void;
  /**
   * Replaces a node's color pair (background + text) via a real
   * `NodeReplaceChange`, dispatched through `onNodesChange`. Added for
   * `15-nodes-color-toolbar.md`'s floating color toolbar.
   */
  updateNodeColor: (nodeId: string, color: NodeColorId) => void;
}

const CanvasNodeActionsContext = createContext<CanvasNodeActions | null>(null);

export const CanvasNodeActionsProvider = CanvasNodeActionsContext.Provider;

/**
 * Read inside a `canvasNode` renderer. Always available in practice —
 * `CanvasFlow` provides it above `<ReactFlow>`, and `CanvasNode` only ever
 * renders as one of `<ReactFlow>`'s registered `nodeTypes`.
 */
export function useCanvasNodeActions(): CanvasNodeActions {
  const actions = useContext(CanvasNodeActionsContext);
  if (!actions) {
    throw new Error("useCanvasNodeActions must be used within a CanvasNodeActionsProvider");
  }
  return actions;
}
