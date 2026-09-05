"use client";

import { Bot, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AiSidebarHeaderProps {
  /** Called when the close button is pressed. */
  onClose: () => void;
}

/**
 * Header for the AI sidebar, per `20-ai-sidebar-shell.md`: title, subtitle,
 * a small bot icon, and a close button aligned to the right.
 */
export function AiSidebarHeader({ onClose }: AiSidebarHeaderProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai/15 text-ai-text">
          <Bot className="h-4 w-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-copy-primary">
            AI Workspace
          </span>
          <span className="text-xs text-copy-muted">
            Collaborate with Ghost AI
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close AI sidebar"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
