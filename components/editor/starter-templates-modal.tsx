"use client";

import { TemplatePreview } from "@/components/editor/canvas/template-preview";
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StarterTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen template; the modal closes right after. */
  onImport: (template: CanvasTemplate) => void;
}

/**
 * Lets a user start a canvas from a pre-built diagram instead of building
 * from scratch, per `18-starter-template.md`. Purely presentational — the
 * actual import (clearing the canvas, then adding the template's nodes and
 * edges) happens wherever `onImport` is wired, so this dialog stays
 * decoupled from the Liveblocks-backed canvas state.
 */
export function StarterTemplatesModal({ open, onOpenChange, onImport }: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription className="text-copy-secondary">
            Importing a template replaces everything currently on the canvas.
          </DialogDescription>
        </DialogHeader>

        {/* Widened to `sm:max-w-4xl` (above) so all `CANVAS_TEMPLATES`
            entries fit in one `sm:grid-cols-3` row instead of wrapping —
            `ScrollArea`'s height is unchanged, this only affects width. */}
        <ScrollArea className="max-h-[28rem]">
          <div className="grid grid-cols-1 gap-3 p-0.5 sm:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-elevated p-3"
              >
                <TemplatePreview template={template} />

                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-copy-primary">{template.name}</p>
                  <p className="text-xs text-copy-muted">{template.description}</p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleImport(template)}
                >
                  Use this template
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
