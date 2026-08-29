"use client";

import { useCallback, useState } from "react";

import { MOCK_PROJECTS } from "@/lib/mock-projects";
import { slugify } from "@/lib/utils";
import type { Project } from "@/types/project";

/**
 * Owns the in-memory mock project list. Per `04-project-dialogs.md`, no API
 * calls or persistence exist yet — create/rename/delete only mutate local
 * state so the sidebar and dialogs have real data to wire against.
 */
export function useMockProjects() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

  const addProject = useCallback((name: string) => {
    setProjects((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, slug: slugify(name), role: "owner" },
    ]);
  }, []);

  const renameProject = useCallback((projectId: string, name: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, name, slug: slugify(name) }
          : project
      )
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
  }, []);

  return { projects, addProject, renameProject, deleteProject };
}
