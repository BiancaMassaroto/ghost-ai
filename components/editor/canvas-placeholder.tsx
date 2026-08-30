import { Compass } from "lucide-react";

interface CanvasPlaceholderProps {
  /** Name of the active project, shown as context but not as the heading. */
  projectName: string;
}

/**
 * Center-of-canvas placeholder shown once a project/room is open, per
 * `08-editor-workspace-shell.md`. No real canvas, Liveblocks, or AI logic
 * yet — this communicates that plainly rather than implying the workspace
 * already does more than chrome and access control.
 */
export function CanvasPlaceholder({ projectName }: CanvasPlaceholderProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand/30 bg-accent-dim text-brand">
        <Compass className="h-7 w-7" />
      </div>

      <span className="text-xs font-medium uppercase tracking-widest text-copy-faint">
        Workspace shell
      </span>

      <h1 className="max-w-lg text-2xl font-semibold text-copy-primary">
        Canvas and collaboration tooling land here next.
      </h1>

      <p className="max-w-md text-sm text-copy-secondary">
        {projectName} is ready for the shared architecture canvas, AI
        workflows, and real-time presence. For now, the shell is wired with
        project context and navigation only.
      </p>
    </div>
  );
}
