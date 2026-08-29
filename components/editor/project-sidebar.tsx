"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

interface ProjectSidebarProps {
  /** Whether the sidebar is expanded into view. */
  isOpen: boolean;
  /** Called when the close button, or the mobile backdrop, is pressed. */
  onClose: () => void;
  projects: Project[];
  /** Opens the Create Project dialog. */
  onNewProject: () => void;
  /** Opens the Rename Project dialog for the given project. */
  onRenameProject: (project: Project) => void;
  /** Opens the Delete Project dialog for the given project. */
  onDeleteProject: (project: Project) => void;
  className?: string;
}

function EmptyProjectsState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-sm text-copy-secondary">{label}</p>
    </div>
  );
}

function ProjectRow({
  project,
  showActions,
  onRename,
  onDelete,
}: {
  project: Project;
  showActions: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-elevated">
      <span className="flex-1 truncate text-sm text-copy-primary">
        {project.name}
      </span>
      {showActions && (
        <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Rename ${project.name}`}
            onClick={onRename}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete ${project.name}`}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProjectSidebar({
  isOpen,
  onClose,
  projects,
  onNewProject,
  onRenameProject,
  onDeleteProject,
  className,
}: ProjectSidebarProps) {
  const ownedProjects = projects.filter((project) => project.role === "owner");
  const sharedProjects = projects.filter(
    (project) => project.role === "collaborator",
  );

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed top-14 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-surface-border bg-surface/95 shadow-2xl backdrop-blur-sm transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border px-4">
          <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close projects sidebar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          defaultValue="my-projects"
          className="flex flex-1 flex-col overflow-hidden px-4 pt-3"
        >
          <TabsList className="w-full">
            <TabsTrigger value="my-projects" className="flex-1">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1">
              Shared
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="my-projects"
            className="flex flex-1 flex-col overflow-y-auto"
          >
            {ownedProjects.length === 0 ? (
              <EmptyProjectsState label="No projects yet." />
            ) : (
              <div className="flex flex-col gap-0.5 py-2">
                {ownedProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    showActions
                    onRename={() => onRenameProject(project)}
                    onDelete={() => onDeleteProject(project)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="shared"
            className="flex flex-1 flex-col overflow-y-auto"
          >
            {sharedProjects.length === 0 ? (
              <EmptyProjectsState label="Nothing has been shared with you yet." />
            ) : (
              <div className="flex flex-col gap-0.5 py-2">
                {sharedProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    showActions={false}
                    onRename={() => onRenameProject(project)}
                    onDelete={() => onDeleteProject(project)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t border-surface-border p-4">
          <Button
            className="w-full justify-center gap-1.5"
            onClick={onNewProject}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  );
}
