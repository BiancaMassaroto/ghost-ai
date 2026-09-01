"use client";

import { createContext, useContext } from "react";

/**
 * Actions a `CanvasEdge` renderer can trigger on itself. Mirrors
 * `CanvasNodeActionsContext` (`canvas-node-context.tsx`): the actual
 * mutation still goes through `useLiveblocksFlow`'s `onEdgesChange`, and an
 * edge renderer only receives `EdgeProps` — it has no access to
 * `onEdgesChange` on its own — so this context is how it reaches it. Added
 * for `16-edge-behavior.md`'s inline edge label editing.
 */
export interface CanvasEdgeActions {
  /** Replaces an edge's label via a real `EdgeReplaceChange`, dispatched through `onEdgesChange`. */
  updateEdgeLabel: (edgeId: string, label: string) => void;
}

const CanvasEdgeActionsContext = createContext<CanvasEdgeActions | null>(null);

export const CanvasEdgeActionsProvider = CanvasEdgeActionsContext.Provider;

/**
 * Read inside a `canvasEdge` renderer. Always available in practice —
 * `CanvasFlow` provides it above `<ReactFlow>`, and `CanvasEdge` only ever
 * renders as one of `<ReactFlow>`'s registered `edgeTypes`.
 */
export function useCanvasEdgeActions(): CanvasEdgeActions {
  const actions = useContext(CanvasEdgeActionsContext);
  if (!actions) {
    throw new Error("useCanvasEdgeActions must be used within a CanvasEdgeActionsProvider");
  }
  return actions;
}
