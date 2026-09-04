import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TaskRun } from "@/app/generated/prisma/client";

/**
 * Loads a `TaskRun` by its Trigger.dev run ID and verifies the given user
 * started it. Returns the row on success, or a ready-to-return response
 * (404 if no run matches, 403 if it belongs to a different user) otherwise —
 * mirrors `lib/project-access.ts`'s `requireProjectOwner`. Used by
 * `POST /api/ai/design/token` to verify ownership before issuing a
 * run-scoped Trigger.dev public token.
 */
export async function requireTaskRunOwner(
  runId: string,
  userId: string,
): Promise<{ taskRun: TaskRun } | { error: NextResponse }> {
  const taskRun = await prisma.taskRun.findUnique({ where: { runId } });

  if (!taskRun) {
    return { error: NextResponse.json({ error: "Run not found" }, { status: 404 }) };
  }

  if (taskRun.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { taskRun };
}
