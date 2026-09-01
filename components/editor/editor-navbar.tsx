"use client";

import { UserButton } from "@clerk/nextjs";
import {
  AlertCircle,
  Check,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
import { cn } from "@/lib/utils";

/**
 * Small pill next to the room-scoped actions showing the canvas autosave
 * state, per `21-canvas-autosave.md`. Not an interactive button (autosave
 * has no manual trigger) — purely a status readout, styled to match the
 * other pill chrome in this navbar.
 */
function SaveStatusIndicator({ status }: { status: CanvasSaveStatus }) {
  if (status === "idle") return null;

  const content = {
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Saving…" },
    saved: { icon: <Check className="h-3.5 w-3.5 text-brand" />, label: "Saved" },
    error: { icon: <AlertCircle className="h-3.5 w-3.5 text-destructive" />, label: "Save failed" },
  }[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs",
        status === "error" ? "text-destructive" : "text-copy-muted"
      )}
    >
      {content.icon}
      {content.label}
    </div>
  );
}

interface EditorNavbarProps {
  /** Whether the project sidebar is currently open. Drives the toggle icon. */
  isSidebarOpen: boolean;
  /** Called when the sidebar toggle button is pressed. */
  onToggleSidebar: () => void;
  /**
   * Name of the project open in the workspace. Undefined at `/editor`
   * (no active room) — the share button and AI sidebar toggle only render
   * alongside a project name, since both are room-scoped actions.
   */
  projectName?: string;
  /** Whether the AI sidebar is currently open. Drives the toggle icon. */
  isAiSidebarOpen?: boolean;
  /** Called when the AI sidebar toggle button is pressed. */
  onToggleAiSidebar?: () => void;
  /** Called when the Share button is pressed. */
  onShare?: () => void;
  /** Called when the Starter Templates button is pressed. */
  onOpenTemplates?: () => void;
  /** Current canvas autosave status, per `21-canvas-autosave.md`. Undefined
   * at `/editor` (no active room), same room-scoped visibility rule as the
   * Share/Templates/AI buttons. */
  saveStatus?: CanvasSaveStatus;
  className?: string;
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  isAiSidebarOpen,
  onToggleAiSidebar,
  onShare,
  onOpenTemplates,
  saveStatus,
  className,
}: EditorNavbarProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-4 border-b border-surface-border bg-surface px-4",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={isSidebarOpen ? "Close projects sidebar" : "Open projects sidebar"}
          onClick={onToggleSidebar}
          className="shrink-0"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>

        {projectName && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-copy-primary">
              {projectName}
            </span>
            <span className="text-xs text-copy-muted">Workspace</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {projectName && (
          <>
            {saveStatus && <SaveStatusIndicator status={saveStatus} />}
            <Button variant="outline" size="sm" onClick={onOpenTemplates} className="gap-1.5">
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </Button>
            <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant={isAiSidebarOpen ? "default" : "outline"}
              size="sm"
              aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              onClick={onToggleAiSidebar}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              AI
            </Button>
          </>
        )}
        <UserButton />
      </div>
    </header>
  );
}
