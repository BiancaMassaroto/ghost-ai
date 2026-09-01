"use client";

import { useEffect } from "react";

/**
 * Shared with `CanvasControlBar`'s zoom/fit-view buttons so a keyboard
 * shortcut and its equivalent button press animate identically.
 */
export const ZOOM_ANIMATION_DURATION_MS = 200;

interface UseKeyboardShortcutsOptions {
  /**
   * Used to drive the zoom shortcuts directly, per `17-canvas-ergonomics.md`.
   * Written out by hand (rather than a `ReactFlowInstance` type import) so
   * this hook accepts the canvas's `ReactFlowInstance<CanvasNode,
   * CanvasEdge>` without depending on those types itself — same reasoning as
   * `CanvasControlBar`'s identical `ZoomViewportHelpers` type.
   */
  reactFlowInstance: {
    zoomIn: (options?: { duration?: number }) => void;
    zoomOut: (options?: { duration?: number }) => void;
  };
  undo: () => void;
  redo: () => void;
}

/** True while focus is inside an input, textarea, select, or any other editable field. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Wires the canvas's zoom and history actions to keyboard shortcuts, per
 * `17-canvas-ergonomics.md`:
 * - `+`/`=` zoom in, `-` zoom out (via the React Flow instance, same short
 *   animation as the control bar's buttons)
 * - `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redo (via the
 *   Liveblocks `undo`/`redo` handlers passed in)
 *
 * Listens on `window` so shortcuts work regardless of what's focused on the
 * canvas, but ignores them entirely while the user is typing in an input,
 * textarea, select, or other editable field (e.g. a node's inline label
 * editor from `14-node-editing.md`, or an edge label from
 * `16-edge-behavior.md`) so normal text editing (selecting text, undoing a
 * keystroke, etc.) isn't hijacked.
 */
export function useKeyboardShortcuts({
  reactFlowInstance,
  undo,
  redo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (isModifierPressed && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (isModifierPressed && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        reactFlowInstance.zoomIn({ duration: ZOOM_ANIMATION_DURATION_MS });
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        reactFlowInstance.zoomOut({ duration: ZOOM_ANIMATION_DURATION_MS });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reactFlowInstance, undo, redo]);
}
