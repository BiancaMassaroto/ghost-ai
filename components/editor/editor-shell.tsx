"use client";

import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";

/**
 * Composes the editor chrome (navbar + project sidebar) and lifts the shared
 * `isSidebarOpen` state between them, per the deferred wiring step noted in
 * `02-editor.md`. The center canvas is a placeholder until the collaborative
 * canvas subsystem (Liveblocks + React Flow) is built.
 */
export function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        />

        <div className="flex h-full items-center justify-center text-sm text-copy-faint">
          Canvas workspace coming soon.
        </div>
      </div>
    </div>
  );
}
