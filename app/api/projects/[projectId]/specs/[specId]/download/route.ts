import { NextRequest, NextResponse } from "next/server";

import { loadSpecMarkdown } from "@/lib/spec-blob";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ projectId: string; specId: string }>;
}

/**
 * GET /api/projects/[projectId]/specs/[specId]/download — returns a
 * previously generated spec as a downloadable Markdown file, per
 * `28-spec-persistance-download.md`. Owner or collaborator, per
 * `checkProjectAccess` — same access rule `POST /api/ai/spec`
 * (`27-spec-generation-flow.md`) uses to trigger generation in the first
 * place, so anyone who could generate a spec can also download it.
 *
 * Not found is returned (rather than a separate "forbidden") both when the
 * project doesn't exist/isn't accessible and when the spec doesn't belong to
 * it — matches the rest of the codebase's `checkProjectAccess`-gated routes,
 * which don't leak which case it was.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, specId } = await params;
  const access = await checkProjectAccess(projectId, identity.userId, identity.email);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const spec = await prisma.projectSpec.findUnique({ where: { id: specId } });
  if (!spec || spec.projectId !== projectId) {
    return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  }

  const result = await loadSpecMarkdown(spec.filePath);

  if (result.status === "not-found") {
    return NextResponse.json({ error: "Spec file not found" }, { status: 404 });
  }
  if (result.status === "error") {
    return NextResponse.json({ error: "Failed to load spec" }, { status: 502 });
  }

  return new NextResponse(result.markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${specId}.md"`,
    },
  });
}
