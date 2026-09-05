"use client";

import { Download, Loader2 } from "lucide-react";
import Markdown from "react-markdown";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectSpecSummary } from "@/types/spec";

interface SpecPreviewDialogProps {
  projectId: string;
  /** The spec being previewed, or `null` when the dialog should be closed. */
  spec: ProjectSpecSummary | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

/**
 * Preview modal for one generated spec, per `29-spec-ui-integration.md`.
 * Built on the existing `components/ui/dialog.tsx` (unmodified, per the
 * protected-foundation rule) — its `DialogPrimitive.Root` already closes on
 * Escape and on an outside click, satisfying "basic keyboard support" with
 * no extra handling here. Content is rendered as Markdown via
 * `react-markdown`, which never renders raw HTML by default — the safer
 * default for AI-generated content, and not a design tradeoff worth a
 * plugin (no tables/GFM in `generate-spec.ts`'s fixed section prompt, so
 * `remark-gfm` isn't pulled in). `components` below map every element to
 * the project's existing tokens (`ui-context.md`) rather than the
 * unstyled-by-default output `react-markdown` produces on its own.
 */
export function SpecPreviewDialog({
  projectId,
  spec,
  content,
  isLoading,
  error,
  onClose,
}: SpecPreviewDialogProps) {
  const downloadUrl = spec
    ? `/api/projects/${projectId}/specs/${spec.id}/download`
    : "";

  return (
    <Dialog open={spec !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-copy-primary">
            {spec?.filename}
          </DialogTitle>
          <DialogDescription>
            {spec ? new Date(spec.createdAt).toLocaleString() : null}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] rounded-xl border border-surface-border bg-elevated px-4">
          {isLoading && (
            <div className="flex h-full items-center justify-center gap-2 py-12 text-sm text-copy-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading spec…
            </div>
          )}
          {error && (
            <p className="py-6 text-sm text-destructive">{error}</p>
          )}
          {!isLoading && !error && content && (
            <div className="py-4 text-sm text-copy-secondary">
              <Markdown
                components={{
                  h1: (props) => (
                    <h1 className="mb-3 text-lg font-semibold text-copy-primary" {...props} />
                  ),
                  h2: (props) => (
                    <h2 className="mt-5 mb-2 text-base font-semibold text-copy-primary" {...props} />
                  ),
                  h3: (props) => (
                    <h3 className="mt-4 mb-1.5 text-sm font-semibold text-copy-primary" {...props} />
                  ),
                  p: (props) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: (props) => (
                    <ul className="mb-3 list-disc space-y-1 pl-5" {...props} />
                  ),
                  ol: (props) => (
                    <ol className="mb-3 list-decimal space-y-1 pl-5" {...props} />
                  ),
                  li: (props) => <li {...props} />,
                  code: (props) => (
                    <code
                      className="rounded-md bg-subtle px-1 py-0.5 font-mono text-xs text-copy-primary"
                      {...props}
                    />
                  ),
                  pre: (props) => (
                    <pre
                      className="mb-3 overflow-x-auto rounded-xl border border-surface-border bg-subtle p-3 font-mono text-xs text-copy-primary"
                      {...props}
                    />
                  ),
                  a: (props) => (
                    <a className="text-brand underline underline-offset-2" {...props} />
                  ),
                }}
              >
                {content}
              </Markdown>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={!spec}
            render={<a href={downloadUrl} />}
            nativeButton={false}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
