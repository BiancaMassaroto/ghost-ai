"use client";

import { Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

const DEMO_SPEC_SNIPPET = `## Overview
System uses a microservices architecture with an
API gateway routing requests to independent services.`;

/**
 * The Specs tab, per `20-ai-sidebar-shell.md`: a Generate Spec trigger and a
 * static demo card previewing what a generated Markdown spec will look
 * like. No spec generation or persistence yet — the button has no handler
 * and the download action stays disabled.
 */
export function SpecsTab() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
      <Button className="w-full justify-center gap-1.5 bg-accent text-accent-foreground hover:bg-accent/80">
        Generate Spec
      </Button>

      <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-elevated p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
            <FileText className="h-4 w-4" />
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-copy-primary">
              system-architecture.md
            </span>
            <pre className="whitespace-pre-wrap font-mono text-xs text-copy-secondary">
              {DEMO_SPEC_SNIPPET}
            </pre>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled
          className="w-full justify-center gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
}
