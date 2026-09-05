import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import type { ProjectSpecSummary } from "@/types/spec";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/specs — lists the metadata for every spec
 * generated for a project, newest first, per `29-spec-ui-integration.md`.
 *
 * Not one of `27-spec-generation-flow.md`/`28-spec-persistance-download.md`'s
 * own routes (both explicitly scoped out frontend/list wiring) — `29`'s own
 * Implementation section assumes "the existing ProjectSpec API" already
 * covers listing, but neither prior unit actually added a list endpoint,
 * only `.../specs/[specId]/download`. Per `ai-workflow-rules.md`'s "resolve
 * ambiguity... before implementing," this is added now: it's the same thin,
 * metadata-only shape as every other list route in `app/api/projects/*`
 * (`collaborators/route.ts`'s `GET`, `checkProjectAccess`-gated, no AI/task
 * logic), not the kind of "backend logic" `29`'s scope limits are actually
 * guarding against (spec generation itself, which stays untouched). See
 * `progress-tracker.md`'s notes on this unit for the full reasoning.
 *
 * Owner or collaborator, same access rule as the download route and
 * `POST /api/ai/spec` — anyone who can generate or download a spec can also
 * see the list. Returns metadata only (`id`, `createdAt`, a derived
 * `filename`) — never the Blob URL itself, so the client has no way to
 * fetch Blob content directly, per this unit's own scope limit.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const access = await checkProjectAccess(projectId, identity.userId, identity.email);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  const summaries: ProjectSpecSummary[] = specs.map((spec) => ({
    id: spec.id,
    filename: `${spec.id}.md`,
    createdAt: spec.createdAt.toISOString(),
  }));

  return NextResponse.json({ specs: summaries });
}
