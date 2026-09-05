import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * Rendered in place of the workspace for a non-existent project, and for a
 * project the signed-in user doesn't own or collaborate on — both cases are
 * treated identically so access denial never leaks which one it was, per
 * `08-editor-workspace-shell.md`.
 */
export function AccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <Lock className="h-8 w-8 text-copy-muted" />

      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium text-copy-primary">Access denied</h1>
        <p className="max-w-sm text-sm text-copy-secondary">
          You don&apos;t have access to this project.
        </p>
      </div>

      <Link
        href="/editor"
        className="text-sm font-medium text-brand hover:underline"
      >
        Back to projects
      </Link>
    </div>
  );
}
