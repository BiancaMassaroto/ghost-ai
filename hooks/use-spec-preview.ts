"use client";

import { useCallback, useRef, useState } from "react";

import type { ProjectSpecSummary } from "@/types/spec";

interface UseSpecPreviewResult {
  /** The spec currently open in the preview modal, or `null` when it's closed. */
  activeSpec: ProjectSpecSummary | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  open: (spec: ProjectSpecSummary) => void;
  close: () => void;
}

/**
 * Owns the spec preview modal's open/closed state and its fetched Markdown
 * content, per `29-spec-ui-integration.md`. `open()` fetches the spec's
 * content through the existing download route
 * (`GET /api/projects/[projectId]/specs/[specId]/download`) via `fetch` —
 * that route's `Content-Disposition: attachment` header only matters to a
 * real browser navigation (the download action below uses one), not to a
 * `fetch` call, which just reads the response body as text — so this reuses
 * the same endpoint rather than the client ever touching Vercel Blob
 * directly, per the spec's explicit scope limit.
 *
 * `content` is cleared on `close()` — nothing here persists spec content
 * beyond the modal actually being open, per "do not store spec content in
 * frontend state long-term."
 *
 * A `requestIdRef` guards against a stale response: clicking spec A then
 * quickly clicking spec B (or closing the modal) before A's `fetch`
 * resolves must not let A's response land afterward and clobber B's
 * content/loading state (or reopen loading state after `close()`). Both
 * `open()` and `close()` bump the ref, invalidating whatever request was
 * previously in flight; the fetch's own callbacks check it's still the
 * request that started them before touching state at all.
 */
export function useSpecPreview(projectId: string): UseSpecPreviewResult {
  const [activeSpec, setActiveSpec] = useState<ProjectSpecSummary | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const open = useCallback(
    (spec: ProjectSpecSummary) => {
      const requestId = ++requestIdRef.current;

      setActiveSpec(spec);
      setContent(null);
      setError(null);
      setIsLoading(true);

      void (async () => {
        try {
          const response = await fetch(
            `/api/projects/${projectId}/specs/${spec.id}/download`,
          );
          if (!response.ok) {
            throw new Error("Couldn't load this spec.");
          }
          const text = await response.text();
          if (requestIdRef.current !== requestId) return;
          setContent(text);
        } catch {
          if (requestIdRef.current !== requestId) return;
          setError("Couldn't load this spec.");
        } finally {
          if (requestIdRef.current === requestId) setIsLoading(false);
        }
      })();
    },
    [projectId],
  );

  const close = useCallback(() => {
    requestIdRef.current += 1;
    setActiveSpec(null);
    setContent(null);
    setError(null);
  }, []);

  return { activeSpec, content, isLoading, error, open, close };
}
