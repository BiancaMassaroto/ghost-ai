import { z } from "zod";

import { aiChatFeedMessageSchema } from "@/types/tasks";

/**
 * Loosely-validated shape of one canvas node/edge as sent by the client for
 * spec generation, per `27-spec-generation-flow.md`. The client posts its
 * in-memory canvas graph directly (`CanvasNode`/`CanvasEdge`, `types/canvas.ts`)
 * rather than this route re-reading Liveblocks Storage itself, so only the
 * handful of fields the spec generator actually reads are declared —
 * `z.looseObject` tolerates the rest of React Flow's own node/edge fields
 * (`selected`, `dragging`, `sourcePosition`, `width`, `height`, ...) without
 * re-declaring every one of them.
 */
const specCanvasNodeSchema = z.looseObject({
  id: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  data: z
    .looseObject({
      label: z.string().optional(),
      shape: z.string().optional(),
      color: z.string().optional(),
    })
    .optional(),
});

const specCanvasEdgeSchema = z.looseObject({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.looseObject({ label: z.string().optional() }).optional(),
});

/**
 * `POST /api/ai/spec`'s request body — the fields a client posts to start a
 * spec generation run. `projectId` is deliberately absent: the route derives
 * it from the already-access-checked `roomId` (the project ID doubles as the
 * Liveblocks room ID, per the existing single-identifier decision) rather
 * than trusting a client-supplied project ID, per `27-spec-generation-flow.md`'s
 * "do not trust a client-supplied projectId." `chatHistory` reuses
 * `aiChatFeedMessageSchema` (`types/tasks.ts`) — the same validated shape
 * already used for the `ai-chat` Liveblocks feed — rather than a second,
 * near-identical chat-message schema.
 */
export const specGenerationRequestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(aiChatFeedMessageSchema).default([]),
  nodes: z.array(specCanvasNodeSchema).default([]),
  edges: z.array(specCanvasEdgeSchema).default([]),
});

export type SpecGenerationRequest = z.infer<typeof specGenerationRequestSchema>;

/**
 * `generate-spec`'s task payload — the request body above plus the
 * server-resolved `projectId`, validated again inside the task itself per
 * the spec's own "validate input with Zod" instruction for the task
 * (distinct from the API route's own request validation) — a Trigger.dev
 * task can in principle be triggered from anywhere the SDK is used, not just
 * `POST /api/ai/spec`, so it re-checks its own input rather than trusting
 * the caller.
 */
export const specGenerationTaskPayloadSchema = specGenerationRequestSchema.extend({
  projectId: z.string().min(1),
});

export type SpecGenerationTaskPayload = z.infer<typeof specGenerationTaskPayloadSchema>;

/**
 * One row's worth of metadata as returned by `GET /api/projects/[projectId]/specs`,
 * per `29-spec-ui-integration.md`. Deliberately excludes `ProjectSpec.filePath`
 * (the Vercel Blob URL) — the client fetches actual content only through
 * `.../specs/[specId]/download`, never the blob directly, per that spec's
 * scope limits. `createdAt` is serialized as an ISO string (a plain JSON
 * response can't carry a `Date`); `filename` is derived server-side (`{id}.md`,
 * matching the download route's own `Content-Disposition` filename) rather
 * than exposing the storage path.
 */
export interface ProjectSpecSummary {
  id: string;
  filename: string;
  createdAt: string;
}
