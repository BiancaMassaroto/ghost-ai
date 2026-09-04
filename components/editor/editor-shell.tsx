"use client";

import { useState } from "react";
import { LiveMap, LiveObject } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import { CanvasRoom } from "@/components/editor/canvas/canvas-room";
import { EditorHome } from "@/components/editor/editor-home";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useProjectActions } from "@/hooks/use-project-actions";
import { useShareDialog } from "@/hooks/use-share-dialog";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
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
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  // Owned here (not inside the canvas subtree) so `EditorNavbar`'s save
  // indicator can read it — `CanvasFlow` reports status up via
  // `onSaveStatusChange`, per `21-canvas-autosave.md`.
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle");
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
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        saveStatus={activeProject ? saveStatus : undefined}
      />

      {/* A real flex row, not overlays — `ProjectSidebar`/`AiSidebar` each
          animate their own width between `0` and their open width, so the
          canvas panel (`flex-1`) reflows to fill whatever space either or
          both leave behind, rather than sidebars floating on top of a
          fixed-size canvas. */}
      <div className="flex flex-1 overflow-hidden bg-canvas p-4">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          projects={[...ownedProjects, ...sharedProjects]}
          activeProjectId={activeProject?.id}
          onNewProject={actions.openCreateDialog}
          onRenameProject={actions.openRenameDialog}
          onDeleteProject={actions.openDeleteDialog}
        />

        {activeProject ? (
          // A single `LiveblocksProvider`/`RoomProvider` wraps both the
          // canvas panel and the AI sidebar, per `24-ai-presence-state.md` —
          // see the Architecture Decision in `progress-tracker.md` for why
          // this moved up from `CanvasRoom` (which mounted its own):
          // `AiArchitectTab`'s `useIsAiThinking`/`useLatestAiStatus` and
          // `AiSidebar` more generally need the same room's presence/feed
          // data, and every Liveblocks hook needs a real `RoomProvider`
          // ancestor to not throw. `AiSidebar` is therefore only ever
          // mounted here, inside the room — matching `EditorNavbar`'s
          // existing rule that its own toggle button is room-scoped too.
          <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
            <RoomProvider
              id={activeProject.id}
              initialPresence={{ cursor: null, thinking: false }}
              initialStorage={{
                flow: new LiveObject({ nodes: new LiveMap(), edges: new LiveMap() }),
              }}
            >
              <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-surface-border bg-surface">
                <CanvasRoom
                  roomId={activeProject.id}
                  isTemplatesModalOpen={isTemplatesModalOpen}
                  onTemplatesModalOpenChange={setIsTemplatesModalOpen}
                  onSaveStatusChange={setSaveStatus}
                />
              </div>

              <AiSidebar
                isOpen={isAiSidebarOpen}
                onClose={() => setIsAiSidebarOpen(false)}
                projectId={activeProject.id}
              />
            </RoomProvider>
          </LiveblocksProvider>
        ) : (
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-surface-border bg-surface">
            <EditorHome onNewProject={actions.openCreateDialog} />
          </div>
        )}
      </div>

      <ProjectDialogs actions={actions} />
      {activeProject && (
        <ShareDialog share={share} isOwner={activeProject.role === "owner"} />
      )}
    </div>
  );
}
