import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireProjectWriteAccess, AccessError } from "@/lib/auth";
import { createFile } from "@/lib/db/queries/files";
const createFileSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  contentText: z.string().optional(),
});

export async function GET() {
  return NextResponse.json(
    { error: "Use /api/projects/:projectId/files to list project files" },
    { status: 410 }
  );
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await requireProjectWriteAccess(parsed.data.projectId, user);

    const file = await createFile({
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      contentText: parsed.data.contentText,
    });

    return NextResponse.json(file);
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 }
    );
  }
}
