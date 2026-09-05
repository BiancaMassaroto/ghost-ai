"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import type { generateSpec } from "@/trigger/generate-spec";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type { AiChatFeedMessage } from "@/types/tasks";

interface UseSpecRunOptions {
  /** The active project's ID — also the Liveblocks room ID, matching `useDesignRun`'s `projectId`. */
  projectId: string;
  /** Called once, when a triggered run finishes successfully. */
  onComplete: () => void;
  /** Called once, whenever starting or running generation fails. */
  onError: (message: string) => void;
}

interface StartSpecRunInput {
  chatHistory: AiChatFeedMessage[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface UseSpecRunResult {
  /** True from `start()` until the run reaches a terminal state (or starting it fails). */
  isActive: boolean;
  /** Submits the current canvas graph + chat history as a new spec generation run. */
  start: (input: StartSpecRunInput) => void;
}

/**
 * Owns the lifecycle of one spec generation run — the same two-call
 * trigger/token/`useRealtimeRun` shape `hooks/use-design-run.ts` established
 * for `POST /api/ai/design`, applied to `POST /api/ai/spec`
 * (`27-spec-generation-flow.md`): calls `POST /api/ai/spec` with
 * `{roomId, chatHistory, nodes, edges}` (the route derives `projectId` from
 * the authorized `roomId` itself), exchanges the returned `runId` for a
 * run-scoped public token via `POST /api/ai/spec/token`, then subscribes
 * with `useRealtimeRun<typeof generateSpec>`.
 *
 * Unlike design generation, this task has no room-scoped context of its
 * own to read — its entire input (canvas graph, chat history) is posted
 * directly in the request body, per `27-spec-generation-flow.md`'s "the
 * client posts its full in-memory canvas graph directly." `start()` takes
 * that input as an argument rather than this hook reading Liveblocks state
 * itself, keeping it usable from `SpecsTab` (outside the `ReactFlowProvider`
 * that owns `useLiveblocksFlow`) the same way `onSaveStatusChange` threads
 * canvas-internal state to chrome outside the canvas subtree.
 */
export function useSpecRun({
  projectId,
  onComplete,
  onError,
}: UseSpecRunOptions): UseSpecRunResult {
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const settledRunIdRef = useRef<string | null>(null);
  const hasActiveRunRef = useRef(false);

  const { run } = useRealtimeRun<typeof generateSpec>(runId ?? undefined, {
    accessToken: accessToken ?? undefined,
    enabled: Boolean(runId && accessToken),
  });

  useEffect(() => {
    if (!runId || !run || run.id !== runId || !run.isCompleted) return;
    if (settledRunIdRef.current === runId) return;
    settledRunIdRef.current = runId;

    if (run.isSuccess) {
      onComplete();
    } else {
      onError(run.error?.message ?? "Spec generation failed.");
    }

    hasActiveRunRef.current = false;
    setRunId(null);
    setAccessToken(null);
  }, [run, runId, onComplete, onError]);

  const start = useCallback(
    ({ chatHistory, nodes, edges }: StartSpecRunInput) => {
      if (hasActiveRunRef.current) return;
      hasActiveRunRef.current = true;
      setIsStarting(true);
      void (async () => {
        try {
          const specResponse = await fetch("/api/ai/spec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: projectId, chatHistory, nodes, edges }),
          });
          if (!specResponse.ok) {
            throw new Error("Couldn't start spec generation. Try again.");
          }
          const { runId: newRunId } = (await specResponse.json()) as { runId: string };

          const tokenResponse = await fetch("/api/ai/spec/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: newRunId }),
          });
          if (!tokenResponse.ok) {
            throw new Error("Couldn't connect to the spec run.");
          }
          const { token } = (await tokenResponse.json()) as { token: string };

          settledRunIdRef.current = null;
          setRunId(newRunId);
          setAccessToken(token);
        } catch (error) {
          hasActiveRunRef.current = false;
          onError(
            error instanceof Error ? error.message : "Spec generation failed to start.",
          );
        } finally {
          setIsStarting(false);
        }
      })();
    },
    [projectId, onError],
  );

  return { isActive: isStarting || Boolean(runId), start };
}
