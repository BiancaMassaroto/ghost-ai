"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { slugify } from "@/lib/utils";
import type { Project } from "@/types/project";

export type ProjectActionMode = "create" | "rename" | "delete";

interface UseProjectActionsOptions {
  /** The project currently open in the workspace, if any — drives the delete redirect. */
  activeProjectId?: string;
}

/** Short suffix so the room ID preview doesn't collide for two projects sharing a name. */
function generateRoomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Owns the Create/Rename/Delete dialog state, the project name input, and
 * the mutations against `/api/projects`, per `07-wire-editor-home.md`.
 * Project *data* is fetched server-side and passed into `EditorShell` as
 * props — this hook doesn't hold its own copy, it re-fetches via
 * `router.refresh()` after a successful rename/delete.
 */
export function useProjectActions({
  activeProjectId,
}: UseProjectActionsOptions = {}) {
  const router = useRouter();
  const [mode, setMode] = useState<ProjectActionMode | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [roomSuffix, setRoomSuffix] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomId = name.trim() ? `${slugify(name)}-${roomSuffix}` : "";

  const closeDialog = useCallback(() => {
    setMode(null);
    setActiveProject(null);
    setName("");
    setIsSubmitting(false);
    setError(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    setActiveProject(null);
    setName("");
    setRoomSuffix(generateRoomSuffix());
    setError(null);
    setMode("create");
  }, []);

  const openRenameDialog = useCallback((project: Project) => {
    setActiveProject(project);
    setName(project.name);
    setError(null);
    setMode("rename");
  }, []);

  const openDeleteDialog = useCallback((project: Project) => {
    setActiveProject(project);
    setName("");
    setError(null);
    setMode("delete");
  }, []);

  const submitCreate = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      if (!response.ok) throw new Error("Failed to create project");
      const { project } = (await response.json()) as { project: { id: string } };
      closeDialog();
      router.push(`/editor/${project.id}`);
    } catch {
      setError("Couldn't create the project. Try again.");
      setIsSubmitting(false);
    }
  }, [name, isSubmitting, closeDialog, router]);

  const submitRename = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !activeProject || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${activeProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      if (!response.ok) throw new Error("Failed to rename project");
      closeDialog();
      router.refresh();
    } catch {
      setError("Couldn't rename the project. Try again.");
      setIsSubmitting(false);
    }
  }, [name, activeProject, isSubmitting, closeDialog, router]);

  const submitDelete = useCallback(async () => {
    if (!activeProject || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${activeProject.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete project");
      const deletedProjectId = activeProject.id;
      closeDialog();
      if (deletedProjectId === activeProjectId) {
        router.push("/editor");
      } else {
        router.refresh();
      }
    } catch {
      setError("Couldn't delete the project. Try again.");
      setIsSubmitting(false);
    }
  }, [activeProject, isSubmitting, activeProjectId, closeDialog, router]);

  return {
    mode,
    activeProject,
    name,
    roomId,
    isSubmitting,
    error,
    setName,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    submitCreate,
    submitRename,
    submitDelete,
  };
}

export type UseProjectActionsResult = ReturnType<typeof useProjectActions>;
