import { NextResponse, type NextRequest } from "next/server";

type JsonBodyResult =
  | { body: Record<string, unknown> }
  | { error: NextResponse };

/**
 * Parses the request body as a JSON object. An empty body is tolerated as
 * `{}` (routes with only optional fields, like project creation, rely on
 * this), but a non-empty body that fails to parse, or that parses to
 * something other than a plain object (an array, string, number, `null`,
 * ...), is rejected with a ready-to-return 400 — per the "validate unknown
 * external input at system boundaries" rule in code-standards.md.
 */
export async function readJsonBody(request: NextRequest): Promise<JsonBodyResult> {
  const text = await request.text();
  if (!text.trim()) return { body: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      error: NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 }),
    };
  }

  return { body: parsed as Record<string, unknown> };
}
