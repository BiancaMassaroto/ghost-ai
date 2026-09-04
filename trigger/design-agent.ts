import { logger, task } from "@trigger.dev/sdk/v3";
// `generateObject` is `@deprecated` on the installed `ai@7` — per
// `AGENTS.md`'s "heed deprecation notices," this uses its documented
// replacement instead: `generateText` with an `Output.object(...)` spec,
// confirmed against `ai`'s own bundled `.d.ts`.
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

import { generateNodeId } from "@/lib/canvas-node";
import {
  AI_AGENT_USER_ID,
  AI_AGENT_USER_INFO,
  jsonPointerSegment,
  liveblocks,
  patchRoomStorage,
  publishAiStatus,
  type JsonPatchOperation,
} from "@/lib/liveblocks";
import {
  DEFAULT_NODE_SIZES,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_COLORS,
  NODE_SHAPES,
  type NodeColorId,
  type NodeShape,
} from "@/types/canvas";
import type { AiStatusFeedMessage } from "@/types/tasks";

/**
 * Design Agent — turns a user prompt into structured node/edge updates on
 * the project's shared canvas, per `23-design-agent-logic.md`. Builds on the
 * wiring-only skeleton from `22-design-agent-api.md`
 * (`POST /api/ai/design` → this task, payload `{ prompt, roomId }`).
 *
 * The room's Liveblocks Storage (`storage.flow`, per `liveblocks.config.ts`)
 * is mutated over Liveblocks' REST API rather than through
 * `@liveblocks/react-flow`'s `useLiveblocksFlow` (this runs server-side, with
 * no React tree) — see `lib/liveblocks.ts`'s `patchRoomStorage` for why JSON
 * Patch, specifically, is the "existing collaborative flow utility" this
 * reuses. AI presence (`liveblocks.setPresence`) and the status feed
 * (`lib/liveblocks.ts`'s `publishAiStatus`, publishing to the
 * `ai-status-feed` Liveblocks feed per `24-ai-presence-state.md`) reuse the
 * same Node SDK client (`lib/liveblocks.ts`'s `liveblocks` singleton)
 * already used by `/api/liveblocks-auth`, per the spec's "reuse existing
 * Liveblocks... presence patterns" instruction — no second Liveblocks client
 * or state system.
 */

// Tried in order — Gemini occasionally returns a transient "high demand"
// `AI_APICallError` (the `ai` SDK already retries a single model call a few
// times internally before giving up), so a second, distinct model is tried
// before the whole run is reported as failed. `gemini-3.6-flash` is a fixed
// dated release rather than a "-latest" alias, on the theory that a capacity
// spike on the aliased model doesn't necessarily hit both the same way.
// (`gemini-2.5-flash`, used here previously, was pulled from new-user access
// ahead of its Oct 2026 retirement — Google's error pointed at this model as
// the replacement.)
const MODEL_IDS = ["gemini-flash-latest", "gemini-3.6-flash"] as const;

// `NODE_SHAPES`/`NODE_COLORS` (from `types/canvas.ts`) are arrays, not
// literal tuples — `z.enum` needs a non-empty tuple type, so these narrow
// them once here rather than inline in the schema below.
const nodeShapeSchema = z.enum(NODE_SHAPES as [NodeShape, ...NodeShape[]]);
const nodeColorSchema = z.enum(
  NODE_COLORS.map((color) => color.id) as [NodeColorId, ...NodeColorId[]],
);
// `z.number()` already rejects non-finite values by default in zod v4 — an
// explicit `.finite()` call is a deprecated no-op on this version.
const positionSchema = z.object({ x: z.number(), y: z.number() });

/**
 * One generation step, matching the 7 actions `23-design-agent-logic.md`
 * requires support for. A union of exact-shape variants (not a looser
 * "patch" object) so the code applying each action below can rely on
 * exactly the fields each action carries.
 *
 * `z.union`, not `z.discriminatedUnion`: zod v4 compiles a discriminated
 * union to JSON Schema `oneOf`, which Gemini's structured-output schema
 * doesn't enforce (it silently drops the constraint, so the model free-forms
 * each action and the result fails this schema's validation on the way
 * back — the `AI_NoObjectGeneratedError` this replaced). A plain `z.union`
 * of the same branches compiles to `anyOf`, which Gemini does support, and
 * keeps every branch's required fields and literal `action` discriminant —
 * the runtime shape, and the inferred `DesignAction` type below, are
 * otherwise identical.
 */
const designActionSchema = z.union([
  z.object({
    action: z.literal("addNode"),
    id: z.string().min(1),
    shape: nodeShapeSchema,
    color: nodeColorSchema,
    label: z.string().min(1),
    position: positionSchema,
  }),
  z.object({
    action: z.literal("moveNode"),
    id: z.string().min(1),
    position: positionSchema,
  }),
  z.object({
    action: z.literal("resizeNode"),
    id: z.string().min(1),
    // Floors reuse the canvas's own resize minimums (`14-node-editing.md`)
    // rather than a generic positivity check — the same size floor a
    // hand-resized node is already held to.
    width: z.number().min(MIN_NODE_WIDTH),
    height: z.number().min(MIN_NODE_HEIGHT),
  }),
  z.object({
    action: z.literal("updateNodeData"),
    id: z.string().min(1),
    label: z.string().min(1).optional(),
    color: nodeColorSchema.optional(),
    shape: nodeShapeSchema.optional(),
  }),
  z.object({
    action: z.literal("deleteNode"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("addEdge"),
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    label: z.string().optional(),
  }),
  z.object({
    action: z.literal("deleteEdge"),
    id: z.string().min(1),
  }),
]);

const designPlanSchema = z.object({
  actions: z.array(designActionSchema),
  // A short, human-readable description of what the plan does — surfaced
  // verbatim in the "processing"/"complete" status events, per the spec's
  // "push clear status messages at key steps."
  summary: z.string().min(1),
});

type DesignAction = z.infer<typeof designActionSchema>;

/** Minimal shape of `storage.flow` as returned by `getStorageDocument(roomId, "json")`. */
interface FlowStorageJson {
  flow?: {
    nodes?: Record<
      string,
      {
        id: string;
        position?: { x: number; y: number };
        data?: { label?: string; shape?: string; color?: string };
      }
    >;
    edges?: Record<
      string,
      { id: string; source: string; target: string; data?: { label?: string } }
    >;
  };
}

/** Loads the room's current nodes/edges, summarized for the model's prompt — empty if the room has no Storage yet. */
async function loadCanvasContext(roomId: string) {
  try {
    const document = (await liveblocks.getStorageDocument(
      roomId,
      "json",
    )) as FlowStorageJson;
    const nodes = Object.values(document.flow?.nodes ?? {});
    const edges = Object.values(document.flow?.edges ?? {});
    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.data?.label ?? "",
        shape: node.data?.shape ?? "rectangle",
        color: node.data?.color ?? "neutral",
        position: node.position ?? { x: 0, y: 0 },
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.data?.label ?? "",
      })),
    };
  } catch (error) {
    logger.warn(
      "design-agent: couldn't load current canvas state, treating it as empty",
      {
        roomId,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return { nodes: [], edges: [] };
  }
}

const SYSTEM_PROMPT = `You are the Ghost AI design agent. You turn a user's plain-English description of a system into nodes and edges on a collaborative system-design canvas.

Allowed node shapes and their meaning — never use any other shape:
- rectangle: default general-purpose component
- diamond: decision or gateway
- circle: event or endpoint
- pill: service or process
- cylinder: database or storage
- hexagon: external system or boundary

Allowed node colors — never use any other color id: ${NODE_COLORS.map((c) => c.id).join(", ")}. Use color to group related or same-kind components consistently (e.g. every datastore the same color), not arbitrarily.

Layout: place nodes left-to-right in the rough order data/requests flow, roughly 200-240 units apart horizontally between stages and 120-160 units apart vertically between nodes in the same stage, starting near x:40, y:40. Avoid overlapping existing nodes.

You can perform exactly these actions:
- addNode: introduce a new component not already on the canvas.
- moveNode / resizeNode / updateNodeData: adjust a node that already exists (use the current canvas state below for valid ids).
- deleteNode: remove a node that already exists.
- addEdge: connect two node ids (existing or ones you're adding in this same plan) with an optional short label describing the relationship (e.g. "writes to", "publishes").
- deleteEdge: remove an edge that already exists.

Only reference an id that already exists on the canvas or that you create earlier in your own action list. Give every new node id a short, unique, kebab-case, "ai-"-prefixed id (e.g. "ai-payment-service") so it can't collide with an existing id. Prefer extending the current design over replacing it, unless the prompt clearly asks to start over.

Write a one-sentence "summary" describing what the plan does, for a status message shown to users.`;

function buildUserPrompt(
  prompt: string,
  context: Awaited<ReturnType<typeof loadCanvasContext>>,
): string {
  return [
    `User prompt: ${prompt}`,
    "",
    "Current canvas state:",
    context.nodes.length === 0
      ? "- (no nodes yet)"
      : context.nodes
          .map(
            (node) =>
              `- node ${node.id}: "${node.label}" (${node.shape}, ${node.color}) at (${node.position.x}, ${node.position.y})`,
          )
          .join("\n"),
    context.edges.length === 0
      ? "- (no edges yet)"
      : context.edges
          .map(
            (edge) =>
              `- edge ${edge.id}: ${edge.source} -> ${edge.target} ("${edge.label}")`,
          )
          .join("\n"),
  ].join("\n");
}

/**
 * Calls Gemini for a design plan, trying each of `MODEL_IDS` in order and
 * falling through to the next on failure (e.g. a transient "high demand"
 * `AI_APICallError` — the `ai` SDK already retries a single call internally
 * before throwing, so a failure here means that model itself is currently
 * unavailable). Throws the last model's error if every model fails.
 */
async function generateDesignPlan(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  system: string,
  prompt: string,
): Promise<{
  plan: z.infer<typeof designPlanSchema>;
  modelId: (typeof MODEL_IDS)[number];
}> {
  let lastError: unknown;

  for (const modelId of MODEL_IDS) {
    try {
      const { output } = await generateText({
        model: google(modelId),
        system,
        prompt,
        output: Output.object({ schema: designPlanSchema }),
      });
      return { plan: output, modelId };
    } catch (error) {
      lastError = error;
      logger.warn(
        "design-agent: model call failed, trying next fallback model",
        {
          modelId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  throw lastError;
}

/**
 * Converts one validated `DesignAction` into the JSON Patch operation(s) that
 * apply it to `storage.flow`. `renamedNodeIds` carries forward any `addNode`
 * id collisions resolved earlier in the same plan, so a later `addEdge`
 * referencing the model's original (colliding) id still points at the id
 * actually written to storage instead of dangling.
 */
function toPatchOperations(
  action: DesignAction,
  usedNodeIds: Set<string>,
  renamedNodeIds: Map<string, string>,
): JsonPatchOperation[] {
  switch (action.action) {
    case "addNode": {
      // Guards against an id collision with a node already on the canvas
      // (the model is instructed to avoid this, but isn't trusted to) by
      // falling back to the same ID generator user-dropped nodes use.
      const id = usedNodeIds.has(action.id)
        ? generateNodeId(action.shape, usedNodeIds.size)
        : action.id;
      if (id !== action.id) renamedNodeIds.set(action.id, id);
      usedNodeIds.add(id);
      const size = DEFAULT_NODE_SIZES[action.shape];
      return [
        {
          op: "add",
          path: `/flow/nodes/${jsonPointerSegment(id)}`,
          value: {
            id,
            type: "canvasNode",
            position: action.position,
            width: size.width,
            height: size.height,
            data: {
              label: action.label,
              color: action.color,
              shape: action.shape,
            },
          },
        },
      ];
    }
    case "moveNode":
      return [
        {
          op: "replace",
          path: `/flow/nodes/${jsonPointerSegment(action.id)}/position`,
          value: action.position,
        },
      ];
    case "resizeNode":
      return [
        {
          op: "replace",
          path: `/flow/nodes/${jsonPointerSegment(action.id)}/width`,
          value: action.width,
        },
        {
          op: "replace",
          path: `/flow/nodes/${jsonPointerSegment(action.id)}/height`,
          value: action.height,
        },
      ];
    case "updateNodeData":
      return (["label", "color", "shape"] as const)
        .filter((field) => action[field] !== undefined)
        .map((field) => ({
          op: "replace" as const,
          path: `/flow/nodes/${jsonPointerSegment(action.id)}/data/${field}`,
          value: action[field],
        }));
    case "deleteNode":
      return [
        { op: "remove", path: `/flow/nodes/${jsonPointerSegment(action.id)}` },
      ];
    case "addEdge":
      return [
        {
          op: "add",
          path: `/flow/edges/${jsonPointerSegment(action.id)}`,
          value: {
            id: action.id,
            type: "canvasEdge",
            source: renamedNodeIds.get(action.source) ?? action.source,
            target: renamedNodeIds.get(action.target) ?? action.target,
            data: { label: action.label ?? "" },
          },
        },
      ];
    case "deleteEdge":
      return [
        { op: "remove", path: `/flow/edges/${jsonPointerSegment(action.id)}` },
      ];
  }
}

async function setAiPresence(
  roomId: string,
  data: { cursor: { x: number; y: number } | null; thinking: boolean },
  ttl?: number,
) {
  await liveblocks.setPresence(roomId, {
    userId: AI_AGENT_USER_ID,
    data,
    userInfo: AI_AGENT_USER_INFO,
    ttl,
  });
}

async function publishStatus(
  roomId: string,
  status: AiStatusFeedMessage["status"],
  message: string,
) {
  // Publishes to the room's shared `ai-status-feed`, per
  // `24-ai-presence-state.md` — supersedes the `broadcastEvent`-based status
  // announcement this used before (see the Architecture Decision in
  // `progress-tracker.md`): a Liveblocks feed persists its messages and is
  // what the AI sidebar now subscribes to, rather than a fire-and-forget
  // room event nothing was consuming.
  await publishAiStatus(roomId, { status, text: message });
}

/** Center point of a set of node positions — used to place the AI's cursor while it applies a plan. */
function centroid(
  positions: { x: number; y: number }[],
): { x: number; y: number } | null {
  if (positions.length === 0) return null;
  const sum = positions.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / positions.length, y: sum.y / positions.length };
}

export const designAgent = task({
  id: "design-agent",
  run: async (payload: { prompt: string; roomId: string }) => {
    const { roomId } = payload;
    const prompt = payload.prompt.trim();

    logger.log("design-agent: received input", { payload });

    if (!prompt) {
      logger.warn("design-agent: empty prompt, nothing to generate", {
        roomId,
      });
      return;
    }

    // Set once `patchRoomStorage` below succeeds. Trigger.dev retries a
    // failed run from the start (`trigger.config.ts`'s `maxAttempts: 3`) — if
    // a later step (e.g. `publishStatus`) throws after the patch already
    // landed, retrying would regenerate a plan and apply a second, duplicate
    // set of `addNode`/`addEdge` operations. Once the patch has landed, the
    // catch block below reports the error but doesn't rethrow, so the retry
    // never fires.
    let patchApplied = false;

    try {
      await setAiPresence(roomId, { cursor: null, thinking: true });
      await publishStatus(
        roomId,
        "started",
        "Ghost AI is reading your prompt…",
      );

      const context = await loadCanvasContext(roomId);

      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY,
      });
      const { plan, modelId } = await generateDesignPlan(
        google,
        SYSTEM_PROMPT,
        buildUserPrompt(prompt, context),
      );

      logger.log("design-agent: generated plan", {
        roomId,
        modelId,
        summary: plan.summary,
        actionCount: plan.actions.length,
      });

      await setAiPresence(roomId, {
        cursor: centroid(
          plan.actions.flatMap((a) => ("position" in a ? [a.position] : [])),
        ),
        thinking: true,
      });
      await publishStatus(roomId, "processing", plan.summary);

      const usedNodeIds = new Set(context.nodes.map((node) => node.id));
      const renamedNodeIds = new Map<string, string>();
      const operations = plan.actions.flatMap((action) =>
        toPatchOperations(action, usedNodeIds, renamedNodeIds),
      );

      await patchRoomStorage(roomId, operations);
      patchApplied = true;

      await publishStatus(roomId, "complete", plan.summary);
      await setAiPresence(roomId, { cursor: null, thinking: false }, 5);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Design generation failed.";
      logger.error("design-agent: generation failed", {
        roomId,
        error: message,
      });

      await publishStatus(roomId, "error", message).catch(() => {});
      await setAiPresence(roomId, { cursor: null, thinking: false }, 5).catch(
        () => {},
      );

      // Re-running after the patch landed would duplicate the plan's nodes.
      if (patchApplied) return;
      throw error;
    }
  },
});
