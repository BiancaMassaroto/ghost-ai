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

interface AiSidebarProps {
  /** Whether the sidebar is slid into view. */
  isOpen: boolean;
  /** Called when the close button is pressed. */
  onClose: () => void;
  className?: string;
}

/**
 * Right-side floating chat sidebar, per `20-ai-sidebar-shell.md`. Open/close
 * state is controlled by the parent (`EditorShell`) — this component owns
 * only the sidebar's own UI structure: the header, the AI Architect/Specs
 * tabs, and their bodies (each split into its own component below).
 * Mirrors `ProjectSidebar`'s collapsing push-panel pattern, anchored to the
 * right edge instead of the left. Still no Liveblocks or AI generation
 * logic — `AiArchitectTab` and `SpecsTab` are UI-only, per the spec's scope
 * limits.
 */
export function AiSidebar({ isOpen, onClose, className }: AiSidebarProps) {
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
            <AiArchitectTab />
          </TabsContent>

          <TabsContent
            value="specs"
            className="flex flex-1 flex-col overflow-hidden pb-4"
          >
            <SpecsTab />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
