import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";

import { readJsonBody } from "@/lib/api-request";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import type { designAgent } from "@/trigger/design-agent";

/**
 * POST /api/ai/design — triggers the `design-agent` background task
 * (`trigger/design-agent.ts`) and records a `TaskRun` so the run can later be
 * looked up with ownership verified (`POST /api/ai/design/token`). Owner or
 * collaborator, per `checkProjectAccess` — design generation targets the
 * project's shared canvas, which is already collaborative.
 *
 * Per `22-design-agent-api.md`'s scope limits: this only triggers the task
 * and records the run — no AI logic, node/edge generation, or canvas writes
 * happen here or in the task itself yet.
 */
export async function POST(request: NextRequest) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;

  const { prompt, projectId } = bodyResult.body;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const access = await checkProjectAccess(projectId, identity.userId, identity.email);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // The project ID doubles as the Liveblocks room ID everywhere else in the
  // app (`liveblocks-auth`'s route, `canvas-room.tsx`) — deriving it from the
  // just-authorized `projectId` here, rather than trusting a separate
  // client-supplied `roomId` field, is what makes the `checkProjectAccess`
  // call above actually authorize the room the task writes into.
  const handle = await tasks.trigger<typeof designAgent>("design-agent", {
    prompt: prompt.trim(),
    roomId: projectId,
  });

  const taskRun = await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId: identity.userId,
    },
  });

  return NextResponse.json({ runId: taskRun.runId });
}
