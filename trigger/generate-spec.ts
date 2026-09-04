import { randomUUID } from "node:crypto";

import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { prisma } from "@/lib/prisma";
import { saveSpecMarkdown } from "@/lib/spec-blob";
import {
  specGenerationTaskPayloadSchema,
  type SpecGenerationTaskPayload,
} from "@/types/spec";

/**
 * Spec Generation — durable AI task per `27-spec-generation-flow.md` and
 * `architecture-context.md`'s AI Generation Model: converts the current
 * canvas graph and chat history into a Markdown technical specification.
 *
 * Triggered by `POST /api/ai/spec` (`app/api/ai/spec/route.ts`), which has
 * already resolved and access-checked `projectId` from `roomId` — this task
 * re-validates its own payload with Zod anyway, per the spec's own "validate
 * input with Zod" instruction for the task itself, since a Trigger.dev task
 * can in principle be triggered from anywhere the SDK is used, not just that
 * one route.
 *
 * Per `28-spec-persistance-download.md`, generation is followed by
 * persistence: the Markdown is uploaded to Vercel Blob
 * (`specs/{projectId}/{specId}.md`, per `architecture-context.md`'s Storage
 * Model) and a `ProjectSpec` row records the blob URL — the same
 * metadata-in-Prisma / content-in-Blob split `21-canvas-autosave.md`
 * established for canvas snapshots. The task still doesn't touch the
 * canvas/chat data models themselves — it only reads the graph/history the
 * client already sent in the request.
 */

// Same fallback rationale as `trigger/design-agent.ts` (`23-design-agent-logic.md`):
// Gemini occasionally returns a transient "high demand" `AI_APICallError`
// (the `ai` SDK already retries a single model call a few times internally
// before giving up), so a second, distinct model is tried before the whole
// run is reported as failed.
const MODEL_IDS = ["gemini-flash-latest", "gemini-3.6-flash"] as const;

const SYSTEM_PROMPT = `You are the Ghost AI spec-writing agent. You turn a system-design canvas (nodes and edges) and its collaborators' chat history into a clear Markdown technical specification.

Write the spec in Markdown with these sections, in order:
1. A title (an "#" heading) summarizing the system.
2. "## Overview" — a short paragraph describing the system's purpose, drawing on the chat history for intent.
3. "## Components" — one entry per node: its name and role, inferred from its label, shape, and color.
4. "## Data Flow" — how the components connect, based on the edges (source -> target and any edge labels).
5. "## Notes" — anything worth calling out (open questions, assumptions) based on the chat history, or omit this section entirely if there's nothing to say.

Only describe what the canvas and chat history actually show — do not invent components, connections, or requirements that aren't present. Output plain Markdown only, with no surrounding commentary.`;

function buildUserPrompt(payload: SpecGenerationTaskPayload): string {
  const { chatHistory, nodes, edges } = payload;

  const nodesSection =
    nodes.length === 0
      ? "(no nodes)"
      : nodes
          .map((node) => {
            const label = node.data?.label || "(untitled)";
            const shape = node.data?.shape ?? "rectangle";
            const color = node.data?.color ?? "neutral";
            return `- ${node.id}: "${label}" (${shape}, ${color})`;
          })
          .join("\n");

  const edgesSection =
    edges.length === 0
      ? "(no edges)"
      : edges
          .map((edge) => {
            const label = edge.data?.label ? ` ("${edge.data.label}")` : "";
            return `- ${edge.source} -> ${edge.target}${label}`;
          })
          .join("\n");

  const chatSection =
    chatHistory.length === 0
      ? "(no chat history)"
      : chatHistory
          .map((message) => `${message.sender} (${message.role}): ${message.content}`)
          .join("\n");

  return [
    "Canvas nodes:",
    nodesSection,
    "",
    "Canvas edges:",
    edgesSection,
    "",
    "Chat history (context for the intent behind the design):",
    chatSection,
  ].join("\n");
}

/**
 * Calls Gemini for the spec's Markdown, trying each of `MODEL_IDS` in order
 * and falling through to the next on failure — same pattern as
 * `design-agent.ts`'s `generateDesignPlan`. Plain `generateText` (not
 * structured output): the task output is Markdown text, not a validated
 * object, so there's no schema for the model's own output here.
 */
async function generateSpecMarkdown(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  prompt: string,
): Promise<{ markdown: string; modelId: (typeof MODEL_IDS)[number] }> {
  let lastError: unknown;

  for (const modelId of MODEL_IDS) {
    try {
      const { text } = await generateText({
        model: google(modelId),
        system: SYSTEM_PROMPT,
        prompt,
      });
      return { markdown: text, modelId };
    } catch (error) {
      lastError = error;
      logger.warn("generate-spec: model call failed, trying next fallback model", {
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw lastError;
}

export const generateSpec = task({
  id: "generate-spec",
  run: async (payload: SpecGenerationTaskPayload) => {
    const parsed = specGenerationTaskPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error("generate-spec: invalid payload", {
        error: parsed.error.flatten(),
      });
      metadata.set("status", "error");
      throw new Error("Invalid generate-spec payload");
    }
    const input = parsed.data;

    logger.log("generate-spec: received input", {
      projectId: input.projectId,
      roomId: input.roomId,
      nodeCount: input.nodes.length,
      edgeCount: input.edges.length,
      chatMessageCount: input.chatHistory.length,
    });

    // Run metadata, not a Liveblocks feed — `useRealtimeRun` (already used by
    // `hooks/use-design-run.ts`) reads this directly off the run for status
    // tracking, per the spec's "update run metadata/status for realtime
    // tracking." Unlike `design-agent.ts`, this task never writes into the
    // room's Liveblocks Storage or its `ai-status-feed`, so there's no
    // room-scoped status channel to reuse here.
    metadata.set("status", "started");

    try {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY,
      });

      metadata.set("status", "generating");

      const { markdown, modelId } = await generateSpecMarkdown(
        google,
        buildUserPrompt(input),
      );

      logger.log("generate-spec: generated spec", {
        projectId: input.projectId,
        modelId,
        length: markdown.length,
      });

      metadata.set("status", "saving");

      // Persist the result: Vercel Blob holds the Markdown content, Prisma
      // holds only the blob URL — same metadata + blob pattern
      // `21-canvas-autosave.md` established for canvas snapshots. The
      // `ProjectSpec` id is generated up front so it can be used for both
      // the blob's pathname and the row's primary key in one pass, rather
      // than writing a placeholder row first and updating it after upload.
      const specId = randomUUID();
      const filePath = await saveSpecMarkdown(input.projectId, specId, markdown);
      const spec = await prisma.projectSpec.create({
        data: { id: specId, projectId: input.projectId, filePath },
      });

      logger.log("generate-spec: persisted spec", {
        projectId: input.projectId,
        specId: spec.id,
      });

      metadata.set("status", "complete");

      return { spec: markdown, specId: spec.id, filePath: spec.filePath };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Spec generation failed.";
      logger.error("generate-spec: generation failed", {
        projectId: input.projectId,
        error: message,
      });
      metadata.set("status", "error");
      throw error;
    }
  },
});
