import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireProjectReadAccess,
  requireProjectWriteAccess,
  AccessError,
} from "@/lib/auth";
import { createFile } from "@/lib/db/queries/files";
import { listFilesInProject } from "@/lib/db/queries/projects";

const createFileSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  contentText: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;
    await requireProjectReadAccess(projectId, user);

    const files = await listFilesInProject(projectId);
    return NextResponse.json({ files });
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;
    await requireProjectWriteAccess(projectId, user);

    const body = await request.json().catch(() => ({}));
    const parsed = createFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const file = await createFile({
      projectId,
      title: parsed.data.title,
      contentText: parsed.data.contentText,
    });
    return NextResponse.json(file);
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
