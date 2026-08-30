import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { checkProjectAccess, getCurrentIdentity, requireProjectOwner } from "@/lib/project-access";
import { readJsonBody } from "@/lib/api-request";
import { listCollaborators } from "@/lib/collaborators";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/projects/[projectId]/collaborators — lists a project's
 * collaborators. Owner or collaborator (read-only), per
 * `09-share-dialog.md`.
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

  const collaborators = await listCollaborators(projectId);
  return NextResponse.json({ collaborators });
}

/**
 * POST /api/projects/[projectId]/collaborators — invites a collaborator by
 * email. Owner-only.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const { projectId } = await params;
  const access = await requireProjectOwner(projectId, auth.userId);
  if ("error" in access) return access.error;

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;
  const body = bodyResult.body;

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    await prisma.projectCollaborator.create({
      data: { projectId: access.project.id, email },
    });
  } catch (error) {
    const isDuplicate =
      typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    if (isDuplicate) {
      return NextResponse.json({ error: "Already a collaborator" }, { status: 409 });
    }
    throw error;
  }

  const collaborators = await listCollaborators(projectId);
  return NextResponse.json({ collaborators }, { status: 201 });
}
