"use client";

import { Bot, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  /** Whether the sidebar is slid into view. */
  isOpen: boolean;
  /** Called when the close button is pressed. */
  onClose: () => void;
  className?: string;
}

/**
 * Right-side placeholder for the future AI chat panel, per
 * `08-editor-workspace-shell.md`. Mirrors `ProjectSidebar`'s collapsing
 * push-panel pattern, anchored to the right edge instead of the left. No AI
 * chat logic yet — chrome and open/close state only, and the copy below is
 * explicit about that so the placeholder can't be mistaken for a working
 * chat surface.
 */
export function AiSidebar({ isOpen, onClose, className }: AiSidebarProps) {
  return (
    // See `ProjectSidebar` for why the width-animating collapse lives on
    // this outer wrapper while the inner `<aside>` stays a fixed `w-96` —
    // including why there's deliberately no `h-full` here (it doesn't
    // resolve against this row's flex-grow height; the default
    // `align-items: stretch` does the sizing instead).
    <div
      className={cn(
        "shrink-0 overflow-hidden transition-all duration-200 ease-out",
        isOpen ? "ml-4 w-96" : "ml-0 w-0",
      )}
    >
      <aside
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          "ml-auto flex h-full w-96 flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-2xl backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-copy-primary">
              AI Copilot
            </span>
            <span className="text-xs text-copy-muted">Placeholder panel</span>
          </div>

          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-ai-text" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close AI sidebar"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex gap-3 rounded-2xl border border-surface-border bg-elevated p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
              <Bot className="h-4 w-4" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-copy-primary">
                Chat surface pending
              </span>
              <span className="text-sm text-copy-secondary">
                The toggle is wired. Messaging and generation are
                intentionally out of scope here.
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-surface-border px-4 py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-copy-faint">
            Future hooks
          </span>
          <p className="mt-1 text-sm text-copy-secondary">
            Prompt composer, run status, and architecture guidance will
            attach to this sidebar.
          </p>
        </div>
      </aside>
    </div>
  );
}
