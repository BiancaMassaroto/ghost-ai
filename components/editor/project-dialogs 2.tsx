"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UseProjectActionsResult } from "@/hooks/use-project-actions";

interface ProjectDialogsProps {
  actions: UseProjectActionsResult;
}

/**
 * Create/Rename/Delete project dialogs, per `07-wire-editor-home.md`. Purely
 * presentational — all state and submit logic live in `useProjectActions`.
 */
export function ProjectDialogs({ actions }: ProjectDialogsProps) {
  const {
    mode,
    activeProject,
    name,
    roomId,
    isSubmitting,
    error,
    setName,
    closeDialog,
    submitCreate,
    submitRename,
    submitDelete,
  } = actions;

  const handleOpenChange = (open: boolean) => {
    if (!open) closeDialog();
  };

  return (
    <>
      <Dialog open={mode === "create"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription className="text-copy-secondary">
              Give your project a name to get started.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitCreate();
            }}
          >
            <Input
              autoFocus
              placeholder="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {roomId && (
              <p className="px-0.5 text-xs text-copy-secondary">{roomId}</p>
            )}
          </form>

          {error && <p className="px-0.5 text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Close
            </Button>
            <Button onClick={submitCreate} disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "rename"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription className="text-copy-secondary">
              Renaming &ldquo;{activeProject?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <Input
              autoFocus
              placeholder="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </form>

          {error && <p className="px-0.5 text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Close
            </Button>
            <Button onClick={submitRename} disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "delete"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="text-copy-secondary">
              This will permanently delete &ldquo;{activeProject?.name}
              &rdquo;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="px-0.5 text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting…" : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
