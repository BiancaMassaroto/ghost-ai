"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode, CanvasSnapshot } from "@/types/canvas";

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

/** Time to wait after the last canvas change before autosaving, so rapid
 * edits (dragging a node, typing a label) coalesce into one write instead of
 * one per keystroke/frame. */
export const CANVAS_AUTOSAVE_DEBOUNCE_MS = 1000;

interface UseCanvasAutosaveOptions {
  /** The project's database ID — also the canvas API route's `[projectId]`. */
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /**
   * Whether autosave is allowed to run yet. `false` while the caller hasn't
   * safely resolved the project's saved canvas snapshot (still loading, or
   * failed to load) — an empty room might be a genuinely fresh project, or
   * might have a real snapshot that just couldn't be read yet, and those
   * look identical from `nodes`/`edges` alone. Saving in that window would
   * risk autosaving an empty-derived state right over a real snapshot, per
   * `21-canvas-autosave.md`'s follow-up fix.
   */
  enabled: boolean;
}

/**
 * Debounced canvas autosave, per `21-canvas-autosave.md`. Watches `nodes`/
 * `edges` (from `useLiveblocksFlow`, the single owner of `storage.flow` per
 * the existing architecture decision) and, `CANVAS_AUTOSAVE_DEBOUNCE_MS`
 * after they settle, `PUT`s the current snapshot to
 * `/api/projects/[projectId]/canvas` — Prisma metadata + Vercel Blob content,
 * per `architecture-context.md`'s Storage Model. Returns the current save
 * status so the caller can surface it (e.g. the navbar's save indicator).
 *
 * Writes are serialized to at most one in-flight `PUT` at a time (see
 * `scheduleSave`/`performSave`) — the debounce alone doesn't prevent two
 * requests from overlapping if a save is still in flight when the next edit
 * settles, and since every save targets the same stable blob path
 * (`allowOverwrite: true`, per `lib/canvas-blob.ts`), a slower *older*
 * request finishing after a faster *newer* one would silently clobber it
 * with stale content.
 */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
}: UseCanvasAutosaveOptions): CanvasSaveStatus {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle");
  // Skips the mount-time run — `nodes`/`edges` settling into their initial
  // value (an empty room, or moments later the loaded saved snapshot) isn't
  // a user edit worth immediately saving back.
  const isFirstRun = useRef(true);
  const isSavingRef = useRef(false);
  // The most recent snapshot that arrived while a save was already in
  // flight — sent as the very next save the instant that one finishes,
  // skipping any snapshot superseded in the meantime.
  const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null);

  // Drains `pendingSnapshotRef` in a loop rather than recursing — a
  // self-referencing `useCallback` (calling `performSave` from inside its
  // own body) can't be memoized by this project's React Compiler. The loop
  // is behaviorally identical: `isSavingRef` stays `true` for the whole
  // drain, so `scheduleSave` keeps queueing into `pendingSnapshotRef`
  // (instead of starting a second, overlapping request) until every
  // snapshot that arrived while a save was in flight has been sent, in
  // order, one at a time.
  const performSave = useCallback(
    async (initialSnapshot: CanvasSnapshot) => {
      isSavingRef.current = true;
      let snapshot: CanvasSnapshot | null = initialSnapshot;

      while (snapshot) {
        setStatus("saving");

        try {
          const response = await fetch(`/api/projects/${projectId}/canvas`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot),
          });
          if (!response.ok) throw new Error("Failed to save canvas");
          setStatus("saved");
        } catch {
          setStatus("error");
        }

        // A newer snapshot may have piled up while that request was in
        // flight — send it next, immediately, rather than waiting for
        // another debounce window.
        snapshot = pendingSnapshotRef.current;
        pendingSnapshotRef.current = null;
      }

      isSavingRef.current = false;
    },
    [projectId],
  );

  const scheduleSave = useCallback(
    (snapshot: CanvasSnapshot) => {
      if (isSavingRef.current) {
        pendingSnapshotRef.current = snapshot;
        return;
      }

      void performSave(snapshot);
    },
    [performSave],
  );

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (!enabled) return;

    const timeoutId = setTimeout(() => {
      scheduleSave({ nodes, edges });
    }, CANVAS_AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, scheduleSave, enabled]);

  return status;
}
