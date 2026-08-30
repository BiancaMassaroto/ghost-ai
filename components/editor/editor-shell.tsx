"use client";

import { useState } from "react";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import { CanvasPlaceholder } from "@/components/editor/canvas-placeholder";
import { EditorHome } from "@/components/editor/editor-home";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useProjectActions } from "@/hooks/use-project-actions";
import { useShareDialog } from "@/hooks/use-share-dialog";
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
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const actions = useProjectActions({ activeProjectId: activeProject?.id });
  const share = useShareDialog({
    projectId: activeProject?.id ?? "",
    isOwner: activeProject?.role === "owner",
  });

  return (
    <div className="flex flex-1 flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        projectName={activeProject?.name}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((open) => !open)}
        onShare={share.open}
      />

      <div className="relative flex-1 bg-canvas">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          projects={[...ownedProjects, ...sharedProjects]}
          activeProjectId={activeProject?.id}
          onNewProject={actions.openCreateDialog}
          onRenameProject={actions.openRenameDialog}
          onDeleteProject={actions.openDeleteDialog}
        />

        <AiSidebar
          isOpen={isAiSidebarOpen}
          onClose={() => setIsAiSidebarOpen(false)}
        />

        {activeProject ? (
          <CanvasPlaceholder projectName={activeProject.name} />
        ) : (
          <EditorHome onNewProject={actions.openCreateDialog} />
        )}
      </div>

      <ProjectDialogs actions={actions} />
      {activeProject && (
        <ShareDialog share={share} isOwner={activeProject.role === "owner"} />
      )}
    </div>
  );
}
