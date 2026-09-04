import { NextRequest, NextResponse } from "next/server";
import { auth as triggerAuth } from "@trigger.dev/sdk/v3";

import { requireUserId } from "@/lib/api-auth";
import { readJsonBody } from "@/lib/api-request";
import { requireTaskRunOwner } from "@/lib/task-run-access";

/**
 * POST /api/ai/spec/token — issues a Trigger.dev public token scoped to read
 * exactly one run, for a client to subscribe to that run's realtime status
 * (`@trigger.dev/react-hooks`). Ownership is verified against the `TaskRun`
 * record `POST /api/ai/spec` created — same ownership check as
 * `POST /api/ai/design/token` (`22-design-agent-api.md`). Per
 * `27-spec-generation-flow.md`, the token expires after 1 hour
 * (`expirationTime: "1h"`) — spec generation runs are one-shot and short, so
 * a run-scoped token has no reason to outlive that.
 */
export async function POST(request: NextRequest) {
  const identity = await requireUserId();
  if ("error" in identity) return identity.error;

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;

  const { runId } = bodyResult.body;
  if (typeof runId !== "string" || runId.trim().length === 0) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const ownerResult = await requireTaskRunOwner(runId, identity.userId);
  if ("error" in ownerResult) return ownerResult.error;

  const token = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [runId] } },
    expirationTime: "1h",
  });

  return NextResponse.json({ token });
}
