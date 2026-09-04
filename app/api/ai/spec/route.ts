import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

import { readJsonBody } from "@/lib/api-request";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import { specGenerationRequestSchema } from "@/types/spec";
import type { generateSpec } from "@/trigger/generate-spec";

/**
 * POST /api/ai/spec — triggers the `generate-spec` background task
 * (`trigger/generate-spec.ts`) and records a `TaskRun` so the run can later
 * be looked up with ownership verified (`POST /api/ai/spec/token`). Owner or
 * collaborator, per `checkProjectAccess` — spec generation reads the shared
 * canvas/chat context, which is already collaborative, same access rule as
 * `POST /api/ai/design` (`22-design-agent-api.md`).
 *
 * Per `27-spec-generation-flow.md`'s scope limits: this only validates
 * input, triggers the task, and records the run — no spec persistence,
 * editor UI, or new AI provider abstraction here or in the task.
 */
export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;

  const parsed = specGenerationRequestSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data;

  // The project ID doubles as the Liveblocks room ID everywhere else in the
  // app (`liveblocks-auth`'s route, `canvas-room.tsx`, `/api/ai/design`) —
  // deriving it from the just-authorized `roomId` here, rather than trusting
  // a separate client-supplied `projectId` field, is what makes this access
  // check actually authorize the project the task reads context for.
  const access = await checkProjectAccess(roomId, identity.userId, identity.email);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    projectId: roomId,
    roomId,
    chatHistory,
    nodes,
    edges,
  });

  const taskRun = await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: roomId,
      userId: identity.userId,
    },
  });

  return NextResponse.json({ runId: taskRun.runId });
}
