import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireProjectReadAccess,
  requireProjectWriteAccess,
  AccessError,
} from "@/lib/auth";
import {
  getProjectWithOwner,
  listFilesInProject,
  softDeleteProject,
  updateProjectMetadata,
} from "@/lib/db/queries/projects";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;

    await requireProjectReadAccess(projectId, user);

    const [row, files] = await Promise.all([
      getProjectWithOwner(projectId),
      listFilesInProject(projectId),
    ]);
    if (!row || row.project.isDeleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.project.id,
      name: row.project.name,
      ownerUserId: row.project.ownerUserId,
      ownerName: row.ownerName,
      ownerUsername: row.ownerUsername,
      lastEditedAt: row.project.lastEditedAt,
      files,
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
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;

    await requireProjectWriteAccess(projectId, user);

    const body = await request.json().catch(() => ({}));
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateProjectMetadata(projectId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;
    const row = await getProjectWithOwner(projectId);
    if (!row) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (row.project.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can delete this project" },
        { status: 403 }
      );
    }

    await softDeleteProject(projectId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
