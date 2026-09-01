"use client";

import { UserButton } from "@clerk/nextjs";
import { LayoutTemplate, PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
