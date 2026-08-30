import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { readJsonBody } from "@/lib/api-request";

const DEFAULT_PROJECT_NAME = "Untitled Project";

/** GET /api/projects — lists the authenticated user's own projects. */
export async function GET() {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const projects = await prisma.project.findMany({
    where: { ownerId: auth.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

/** POST /api/projects — creates a project owned by the authenticated user. */
export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("error" in auth) return auth.error;

  const bodyResult = await readJsonBody(request);
  if ("error" in bodyResult) return bodyResult.error;
  const body = bodyResult.body;

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : DEFAULT_PROJECT_NAME;

  const project = await prisma.project.create({
    data: { ownerId: auth.userId, name },
  });

  return NextResponse.json({ project }, { status: 201 });
}
