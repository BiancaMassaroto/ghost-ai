"use client";

import { useCallback, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SpecPreviewDialog } from "@/components/editor/spec-preview-dialog";
import { useAiChatFeed } from "@/hooks/use-ai-chat-feed";
import { useProjectSpecs } from "@/hooks/use-project-specs";
import { useSpecPreview } from "@/hooks/use-spec-preview";
import { useSpecRun } from "@/hooks/use-spec-run";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type { ProjectSpecSummary } from "@/types/spec";

interface SpecsTabProps {
  /** The active project's ID — also the Liveblocks room ID, matching `AiArchitectTab`'s `projectId` prop. */
  projectId: string;
  /** The live canvas graph, reported up from `CanvasFlow` via `EditorShell`/`AiSidebar` — posted to `POST /api/ai/spec` when "Generate Spec" is pressed. */
  canvasNodes: CanvasNode[];
  canvasEdges: CanvasEdge[];
  /** `false` while a saved canvas snapshot might still be loading — "Generate Spec" stays disabled until this is `true`, so a run can't post the room's transient empty-before-the-snapshot-lands graph as if it were the project's real content. */
  isCanvasReady: boolean;
}

/**
 * The Specs tab, per `29-spec-ui-integration.md`: lists specs already
 * generated for this project (`useProjectSpecs`, metadata only), lets a user
 * open one in a Markdown preview modal (`useSpecPreview`, content fetched on
 * demand through the existing download route — never Blob directly), and
 * download any spec straight from the list or the modal.
 *
 * "Generate Spec" now actually triggers generation: `useSpecRun` follows the
 * same trigger/token/`useRealtimeRun` shape `useDesignRun` already uses for
 * design generation, posting the *current* canvas graph (via the
 * `canvasNodes`/`canvasEdges` props above) and the room's `ai-chat` history
 * (`useAiChatFeed`, a second subscription to the same feed
 * `AiArchitectTab` already reads — safe, since Liveblocks feed hooks are
 * meant to be read from multiple components). On success, the spec list is
 * refreshed so the newly-generated spec appears without a page reload.
 */
export function SpecsTab({
  projectId,
  canvasNodes,
  canvasEdges,
  isCanvasReady,
}: SpecsTabProps) {
  const { specs, isLoading, error, refresh } = useProjectSpecs(projectId);
  const preview = useSpecPreview(projectId);
  const { messages } = useAiChatFeed();
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleSpecComplete = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleSpecError = useCallback((message: string) => {
    setGenerationError(message);
  }, []);

  const specRun = useSpecRun({
    projectId,
    onComplete: handleSpecComplete,
    onError: handleSpecError,
  });

  function handleGenerateClick() {
    // Defensive, not just a UI nicety — the button below is also disabled
    // while `!isCanvasReady`, but guarding here too means a stale click
    // (queued before a re-render disabled it) still can't submit the
    // canvas's transient empty pre-load state as a real spec.
    if (!isCanvasReady) return;
    setGenerationError(null);
    specRun.start({
      chatHistory: messages.map(({ sender, role, content, timestamp }) => ({
        sender,
        role,
        content,
        timestamp,
      })),
      nodes: canvasNodes,
      edges: canvasEdges,
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden py-4">
      <Button
        onClick={handleGenerateClick}
        disabled={specRun.isActive || !isCanvasReady}
        className="w-full shrink-0 justify-center gap-1.5 bg-accent text-accent-foreground hover:bg-accent/80"
      >
        {specRun.isActive ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating…
          </>
        ) : (
          "Generate Spec"
        )}
      </Button>

      {!isCanvasReady && !specRun.isActive && (
        <p className="-mt-2 shrink-0 text-xs text-copy-muted">
          Waiting for the canvas to finish loading…
        </p>
      )}

      {generationError && (
        <p className="-mt-2 shrink-0 text-xs text-destructive">{generationError}</p>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center gap-2 py-8 text-sm text-copy-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading specs…
          </div>
        )}

        {!isLoading && error && (
          <p className="px-1 py-2 text-sm text-destructive">{error}</p>
        )}

        {!isLoading && !error && specs.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
              <FileText className="h-4 w-4" />
            </span>
            <p className="text-sm text-copy-secondary">
              No specs generated yet.
            </p>
          </div>
        )}

        {!isLoading &&
          !error &&
          specs.map((spec) => (
            <SpecRow
              key={spec.id}
              spec={spec}
              projectId={projectId}
              onClick={() => preview.open(spec)}
            />
          ))}
      </div>

      <SpecPreviewDialog
        projectId={projectId}
        spec={preview.activeSpec}
        content={preview.content}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={preview.close}
      />
    </div>
  );
}

interface SpecRowProps {
  spec: ProjectSpecSummary;
  projectId: string;
  onClick: () => void;
}

/** One row in the spec list — filename + createdAt, clickable to preview, plus its own download action, per the spec's "list item" download requirement. */
function SpecRow({ spec, projectId, onClick }: SpecRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-surface-border bg-elevated p-3 text-left transition-colors hover:bg-subtle"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
        <FileText className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-copy-primary">
          {spec.filename}
        </span>
        <span className="text-xs text-copy-muted">
          {new Date(spec.createdAt).toLocaleString()}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Download ${spec.filename}`}
        onClick={(event) => event.stopPropagation()}
        render={<a href={`/api/projects/${projectId}/specs/${spec.id}/download`} />}
        nativeButton={false}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
    </button>
  );
}
