"use client";

import { useCallback, useState } from "react";

import { slugify } from "@/lib/utils";
import type { Project } from "@/types/project";

export type ProjectDialogMode = "create" | "rename" | "delete";

interface UseProjectDialogsOptions {
  onCreate: (name: string) => void;
  onRename: (projectId: string, name: string) => void;
  onDelete: (projectId: string) => void;
}

/**
 * Dedicated hook for the Create/Rename/Delete project dialogs, per
 * `04-project-dialogs.md`. Owns dialog state, form state, and loading state;
 * data mutations are delegated to the callbacks passed in (see
 * `useMockProjects`) so this hook stays UI-only.
 */
export function useProjectDialogs({
  onCreate,
  onRename,
  onDelete,
}: UseProjectDialogsOptions) {
  const [mode, setMode] = useState<ProjectDialogMode | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeDialog = useCallback(() => {
    setMode(null);
    setActiveProject(null);
    setName("");
    setIsSubmitting(false);
  }, []);

  const openCreateDialog = useCallback(() => {
    setActiveProject(null);
    setName("");
    setMode("create");
  }, []);

  const openRenameDialog = useCallback((project: Project) => {
    setActiveProject(project);
    setName(project.name);
    setMode("rename");
  }, []);

  const openDeleteDialog = useCallback((project: Project) => {
    setActiveProject(project);
    setName("");
    setMode("delete");
  }, []);

  const submitCreate = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onCreate(trimmedName);
    closeDialog();
  }, [name, isSubmitting, onCreate, closeDialog]);

  const submitRename = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !activeProject || isSubmitting) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onRename(activeProject.id, trimmedName);
    closeDialog();
  }, [name, activeProject, isSubmitting, onRename, closeDialog]);

  const submitDelete = useCallback(async () => {
    if (!activeProject || isSubmitting) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onDelete(activeProject.id);
    closeDialog();
  }, [activeProject, isSubmitting, onDelete, closeDialog]);

  return {
    mode,
    activeProject,
    name,
    slug: slugify(name),
    isSubmitting,
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

export type UseProjectDialogsResult = ReturnType<typeof useProjectDialogs>;
