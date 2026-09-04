import { logger, task } from "@trigger.dev/sdk/v3";

/**
 * Spec Generation — durable AI task per `architecture-context.md`'s AI
 * Generation Model: converts the current canvas graph (plus project context)
 * into a persisted Markdown technical spec.
 *
 * Skeleton only — no feature spec defines the graph → Markdown generation
 * logic yet, and no `Spec` Prisma model exists (`project-overview.md` says
 * specs are "persisted as files and linked to the project in the database,"
 * but that link isn't schema'd yet — see `prisma/models/`). Wiring this up
 * for real needs, at minimum:
 * - An `app/api` route that validates the request and checks project access
 *   (`lib/project-access.ts`), then triggers this task by id
 *   (`tasks.trigger<typeof generateSpec>("generate-spec", ...)`) — request
 *   handlers must not run this work inline (`code-standards.md`).
 * - Loading the current canvas graph (`lib/canvas-blob.ts`'s
 *   `loadCanvasSnapshot`, off `Project.canvasJsonPath`).
 * - The actual graph → Markdown generation call (model/provider TBD).
 * - Persisting the result to Vercel Blob at `specs/{projectId}/{specId}.md`
 *   (per the Storage Model) and adding the `Spec` model + FK this needs.
 */
export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: { projectId: string }) => {
    logger.log("generate-spec: skeleton only, not yet implemented", { payload });

    // TODO: load the current canvas graph (lib/canvas-blob.ts)
    // TODO: generate a Markdown spec from the graph + project context
    // TODO: persist to Vercel Blob and link it in Prisma once a Spec model exists
  },
});
