"use client";

import { useState } from "react";

import { EditorHome } from "@/components/editor/editor-home";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { useMockProjects } from "@/hooks/use-mock-projects";
import { useProjectDialogs } from "@/hooks/use-project-dialogs";

/**
 * Composes the editor chrome (navbar + project sidebar), the editor home
 * state, and the Create/Rename/Delete project dialogs, per
 * `04-project-dialogs.md`. Project data is mocked in `useMockProjects` —
 * no API calls or persistence yet. The real collaborative canvas
 * (Liveblocks + React Flow, per `architecture-context.md`) isn't built yet,
 * so `EditorHome` stands in as the only canvas-area state.
 */
export function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { projects, addProject, renameProject, deleteProject } =
    useMockProjects();
  const dialogs = useProjectDialogs({
    onCreate: addProject,
    onRename: renameProject,
    onDelete: deleteProject,
  });

  return (
    <div className="flex flex-1 flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      <div className="relative flex-1 bg-base">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          projects={projects}
          onNewProject={dialogs.openCreateDialog}
          onRenameProject={dialogs.openRenameDialog}
          onDeleteProject={dialogs.openDeleteDialog}
        />

        <EditorHome onNewProject={dialogs.openCreateDialog} />
      </div>

      <ProjectDialogs dialogs={dialogs} />
    </div>
  );
}
