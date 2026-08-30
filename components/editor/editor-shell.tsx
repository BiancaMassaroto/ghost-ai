"use client";

import { useState } from "react";

import { EditorHome } from "@/components/editor/editor-home";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { Project } from "@/types/project";

interface EditorShellProps {
  /** Projects owned by the signed-in user, fetched server-side. */
  ownedProjects: Project[];
  /** Projects the signed-in user was added to as a collaborator. */
  sharedProjects: Project[];
  /** The project open in the workspace, if any — undefined at `/editor`. */
  activeProject?: Project;
}

/**
 * Composes the editor chrome (navbar + project sidebar), the editor home
 * state, and the Create/Rename/Delete project dialogs, per
 * `07-wire-editor-home.md`. Project data is fetched server-side (owner and
 * shared lists) and passed down as props — no client-side fetching for
 * initial load. `useProjectActions` performs the real create/rename/delete
 * mutations and triggers `router.refresh()`/navigation afterward.
 */
export function EditorShell({
  ownedProjects,
  sharedProjects,
  activeProject,
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const actions = useProjectActions({ activeProjectId: activeProject?.id });

  return (
    <div className="flex flex-1 flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      <div className="relative flex-1 bg-canvas">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          projects={[...ownedProjects, ...sharedProjects]}
          onNewProject={actions.openCreateDialog}
          onRenameProject={actions.openRenameDialog}
          onDeleteProject={actions.openDeleteDialog}
        />

        {activeProject ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <h1 className="text-lg font-medium text-copy-primary">
              {activeProject.name}
            </h1>
            <p className="max-w-sm text-sm text-copy-secondary">
              Canvas workspace coming soon.
            </p>
          </div>
        ) : (
          <EditorHome onNewProject={actions.openCreateDialog} />
        )}
      </div>

      <ProjectDialogs actions={actions} />
    </div>
  );
}
