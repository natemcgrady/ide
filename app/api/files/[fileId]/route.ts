import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireFileReadAccess,
  requireFileWriteAccess,
  AccessError,
} from "@/lib/auth";
import {
  getFileWithOwner,
  updateFileMetadata,
  softDeleteFile,
} from "@/lib/db/queries/files";
import { z } from "zod";

const updateFileSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  contentText: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await requireAuth();
    const { fileId } = await params;

    const row = await getFileWithOwner(fileId);
    if (!row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await requireFileReadAccess(fileId, user);

    return NextResponse.json({
      id: row.file.id,
      projectId: row.projectId,
      title: row.file.title,
      contentText: row.file.contentText,
      ownerUserId: row.ownerUserId,
      ownerName: row.ownerName,
      ownerUsername: row.ownerUsername,
      lastEditedAt: row.file.lastEditedAt,
    });
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await requireAuth();
    const { fileId } = await params;

    await requireFileWriteAccess(fileId, user);

    const body = await request.json().catch(() => ({}));
    const parsed = updateFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateFileMetadata(fileId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await requireAuth();
    const { fileId } = await params;

    const row = await getFileWithOwner(fileId);
    if (!row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (row.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can delete this file" },
        { status: 403 }
      );
    }

    await softDeleteFile(fileId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
