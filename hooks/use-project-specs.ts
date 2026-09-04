"use client";

import { useCallback, useEffect, useState } from "react";

import type { ProjectSpecSummary } from "@/types/spec";

interface UseProjectSpecsResult {
  specs: ProjectSpecSummary[];
  isLoading: boolean;
  error: string | null;
  /** Re-fetches the list — called once a `useSpecRun` triggered from this project completes, so a freshly-generated spec shows up without a manual page refresh. */
  refresh: () => void;
}

/**
 * Fetches the list of generated specs for a project, per
 * `29-spec-ui-integration.md`: `GET /api/projects/[projectId]/specs`,
 * metadata only (`id`/`filename`/`createdAt`) — content is fetched
 * separately, on demand, by `useSpecPreview` below, per this spec's own
 * "ProjectSpec only provides metadata, content must be fetched separately."
 * Holds only this list in state, nothing global, per the spec's scope limit.
 *
 * `refresh()` bumps a `refreshKey` dependency to re-run the fetch effect —
 * deliberately does *not* reset `isLoading`/`error` back to their initial
 * values first (a synchronous `setState` at the top of an effect body trips
 * `react-hooks/set-state-in-effect`; see `29`'s own progress-tracker notes
 * on the first version of this hook). A refresh instead just quietly
 * updates `specs` once the re-fetch resolves — no loading flicker for what
 * is, from the user's point of view, "the list caught up with a spec that
 * just finished generating."
 */
export function useProjectSpecs(projectId: string): UseProjectSpecsResult {
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/specs`);
        if (!response.ok) {
          throw new Error("Couldn't load specs.");
        }
        const { specs: fetched } = (await response.json()) as {
          specs: ProjectSpecSummary[];
        };
        if (!cancelled) {
          setSpecs(fetched);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Couldn't load specs.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { specs, isLoading, error, refresh };
}
