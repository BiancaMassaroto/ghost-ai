"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EditorHomeProps {
  /** Called when "New Project" is pressed — opens the Create Project dialog. */
  onNewProject: () => void;
}

/**
 * Editor home state: shown in the canvas area before a project is open, per
 * `04-project-dialogs.md`. Minimal — no cards.
 */
export function EditorHome({ onNewProject }: EditorHomeProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-medium text-copy-primary">
        Create a project or open an existing one
      </h1>
      <p className="max-w-sm text-sm text-copy-secondary">
        Start a new architecture workspace, or choose a project from the
        sidebar.
      </p>
      <Button className="gap-1.5" onClick={onNewProject}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}
