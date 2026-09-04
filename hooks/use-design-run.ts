"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import type { designAgent } from "@/trigger/design-agent";

interface UseDesignRunOptions {
  /** The active project's ID — also the Liveblocks room ID (`26-design-agent-frontend.md`'s `roomId`/`projectId` are always the same value here; see the Architecture Decision in `progress-tracker.md`). */
  projectId: string;
  /** Called once, when a triggered run finishes successfully. */
  onComplete: () => void;
  /** Called once, whenever starting or running generation fails — a failed `POST /api/ai/design` or `/token` call, or the run itself finishing unsuccessfully. */
  onError: (message: string) => void;
}

interface UseDesignRunResult {
  /** True from `start()` until the run reaches a terminal state (or starting it fails). Drives the disabled/loading state in `ai-architect-tab.tsx`. */
  isActive: boolean;
  /** Submits `prompt` as a new AI design generation run. */
  start: (prompt: string) => void;
}

/**
 * Owns the lifecycle of one AI design generation run, per
 * `26-design-agent-frontend.md`: calls `POST /api/ai/design` with
 * `{prompt, projectId}` (the route derives the Liveblocks room id from the
 * authorized `projectId` itself, rather than trusting a client-supplied
 * `roomId`), exchanges the returned `runId` for a run-scoped public
 * token, then subscribes to that run's realtime status with
 * `useRealtimeRun`. Never touches chat messages or canvas nodes/edges itself
 * — `onComplete`/`onError` let the caller (`AiArchitectTab`) decide what to
 * do once the run settles (push a message to the `ai-chat` feed), keeping
 * this hook's own responsibility to "manage one run" only.
 *
 * Adapts the spec's own wording to the actual `/api/ai/design` contract
 * built in `22-design-agent-api.md`: that spec describes a single response
 * shaped `{runId, publicToken}`, but the route that exists only returns
 * `{runId}` — the public token is a separate call,
 * `POST /api/ai/design/token` with `{runId}`, returning `{token}`. Backend
 * changes are out of scope for this unit, so this hook calls both routes in
 * sequence instead of assuming a response shape that was never built.
 */
export function useDesignRun({
  projectId,
  onComplete,
  onError,
}: UseDesignRunOptions): UseDesignRunResult {
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  // Guards against acting on the same run's completion twice (the effect
  // below re-runs on every `run` update while a run is active) and against
  // a stale, previously-completed run's data (kept in the underlying hook's
  // own cache, keyed by a stable hook id rather than `runId`) being
  // mistaken for the new run started right after — the `run.id !== runId`
  // check in the effect covers that second case.
  const settledRunIdRef = useRef<string | null>(null);
  // A ref, not just `isStarting`/`runId` state, guards `start()` against a
  // second rapid call: React doesn't commit `setIsStarting(true)` before a
  // second synchronous invocation (e.g. a double-click) re-enters this
  // callback, so a state-only guard lets both calls through and starts two
  // background runs — the second response then clobbers `runId`/
  // `accessToken` while the first run keeps executing with no UI tracking
  // it. Set synchronously at the top of `start()`; cleared once startup
  // fails or the run this call started reaches a terminal state.
  const hasActiveRunRef = useRef(false);

  const { run } = useRealtimeRun<typeof designAgent>(runId ?? undefined, {
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
      onError(run.error?.message ?? "Design generation failed.");
    }

    hasActiveRunRef.current = false;
    setRunId(null);
    setAccessToken(null);
  }, [run, runId, onComplete, onError]);

  const start = useCallback(
    (prompt: string) => {
      if (hasActiveRunRef.current) return;
      hasActiveRunRef.current = true;
      setIsStarting(true);
      void (async () => {
        try {
          const designResponse = await fetch("/api/ai/design", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, projectId }),
          });
          if (!designResponse.ok) {
            throw new Error("Couldn't start design generation. Try again.");
          }
          const { runId: newRunId } = (await designResponse.json()) as { runId: string };

          const tokenResponse = await fetch("/api/ai/design/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: newRunId }),
          });
          if (!tokenResponse.ok) {
            throw new Error("Couldn't connect to the design run.");
          }
          const { token } = (await tokenResponse.json()) as { token: string };

          settledRunIdRef.current = null;
          setRunId(newRunId);
          setAccessToken(token);
        } catch (error) {
          hasActiveRunRef.current = false;
          onError(
            error instanceof Error ? error.message : "Design generation failed to start.",
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
