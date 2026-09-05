"use client";

import { AiArchitectTab } from "@/components/editor/ai-architect-tab";
import { AiSidebarHeader } from "@/components/editor/ai-sidebar-header";
import { SpecsTab } from "@/components/editor/specs-tab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface AiSidebarProps {
  /** Whether the sidebar is slid into view. */
  isOpen: boolean;
  /** Called when the close button is pressed. */
  onClose: () => void;
  /** The active project's ID — also the Liveblocks room ID, per `26-design-agent-frontend.md`'s `AiArchitectTab`. */
  projectId: string;
  /** The live canvas graph, reported up from `CanvasFlow` via `EditorShell` — `SpecsTab` posts this to `POST /api/ai/spec` when "Generate Spec" is pressed. */
  canvasNodes: CanvasNode[];
  canvasEdges: CanvasEdge[];
  /** Whether the canvas has finished resolving its real state (no saved snapshot still loading) — see `CanvasFlowProps.onCanvasStateChange`'s doc in `canvas.tsx`. `SpecsTab` disables "Generate Spec" while this is `false`, so a run can't post the room's transient empty-before-the-snapshot-lands graph. */
  isCanvasReady: boolean;
  className?: string;
}

/**
 * Right-side floating chat sidebar, per `20-ai-sidebar-shell.md`. Open/close
 * state is controlled by the parent (`EditorShell`) — this component owns
 * only the sidebar's own UI structure: the header, the AI Architect/Specs
 * tabs, and their bodies (each split into its own component below).
 * Mirrors `ProjectSidebar`'s collapsing push-panel pattern, anchored to the
 * right edge instead of the left. `AiArchitectTab` now owns real Liveblocks
 * chat/status/presence and AI generation logic (`25-sidebar-chat-feed.md`,
 * `24-ai-presence-state.md`, `26-design-agent-frontend.md`); `projectId`
 * (the active project's ID, also the Liveblocks room ID) is threaded through
 * to it unchanged. `SpecsTab` now also takes `projectId` — it lists,
 * previews, and downloads real generated specs, per
 * `29-spec-ui-integration.md` (generation itself stays out of scope).
 */
export function AiSidebar({
  isOpen,
  onClose,
  projectId,
  canvasNodes,
  canvasEdges,
  isCanvasReady,
  className,
}: AiSidebarProps) {
  return (
    // See `ProjectSidebar` for why the width-animating collapse lives on
    // this outer wrapper while the inner `<aside>` stays a fixed `w-96` —
    // including why there's deliberately no `h-full` here (it doesn't
    // resolve against this row's flex-grow height; the default
    // `align-items: stretch` does the sizing instead).
    <div
      className={cn(
        "shrink-0 overflow-hidden transition-all duration-200 ease-out",
        isOpen ? "ml-4 w-96" : "ml-0 w-0",
      )}
    >
      <aside
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          "ml-auto flex h-full w-96 flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-2xl backdrop-blur-sm",
          className,
        )}
      >
        <AiSidebarHeader onClose={onClose} />

        <Tabs
          defaultValue="architect"
          className="flex flex-1 flex-col overflow-hidden px-4 pt-3"
        >
          <TabsList className="w-full rounded-full bg-subtle p-1">
            <TabsTrigger
              value="architect"
              className="flex-1 rounded-full text-copy-muted data-active:bg-accent data-active:text-accent-foreground"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="flex-1 rounded-full text-copy-muted data-active:bg-accent data-active:text-accent-foreground"
            >
              Specs
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="architect"
            className="flex flex-1 flex-col overflow-hidden pb-4"
          >
            <AiArchitectTab projectId={projectId} />
          </TabsContent>

          <TabsContent
            value="specs"
            className="flex flex-1 flex-col overflow-hidden pb-4"
          >
            <SpecsTab
              projectId={projectId}
              canvasNodes={canvasNodes}
              canvasEdges={canvasEdges}
              isCanvasReady={isCanvasReady}
            />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
