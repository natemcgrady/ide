import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  createProject,
  getProjectCollaboratorCount,
  getProjectFileCount,
  listProjectsForUser,
} from "@/lib/db/queries/projects";

const createProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const { owned, shared } = await listProjectsForUser(user.id);

    const withStats = async (
      items: Array<{
        id: string;
        name: string;
        lastEditedAt: Date;
        ownerUserId: string;
        isOwner: boolean;
      }>
    ) => {
      return Promise.all(
        items.map(async (item) => ({
          ...item,
          fileCount: await getProjectFileCount(item.id),
          collaboratorCount: await getProjectCollaboratorCount(item.id),
        }))
      );
    };

    const [ownedWithStats, sharedWithStats] = await Promise.all([
      withStats(owned),
      withStats(shared),
    ]);

    return NextResponse.json({
      owned: ownedWithStats,
      shared: sharedWithStats,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    const parsed = createProjectSchema.safeParse(body);
    const input = parsed.success ? parsed.data : {};

    const project = await createProject({
      ownerUserId: user.id,
      name: input.name,
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
