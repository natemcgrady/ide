import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  listFilesForUser,
  createFile,
  getCollaboratorCount,
} from "@/lib/db/queries/files";
import { z } from "zod";

const createFileSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  language: z.enum(["python", "typescript"]).optional(),
  contentText: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const { owned, shared } = await listFilesForUser(user.id);

    const withCollaboratorCount = async (
      items: Array<{
        id: string;
        title: string;
        language: string;
        lastEditedAt: Date;
        ownerUserId: string;
        isOwner: boolean;
      }>
    ) => {
      return Promise.all(
        items.map(async (item) => ({
          ...item,
          collaboratorCount: await getCollaboratorCount(item.id),
        }))
      );
    };

    const [ownedWithCount, sharedWithCount] = await Promise.all([
      withCollaboratorCount(owned),
      withCollaboratorCount(shared),
    ]);

    return NextResponse.json({
      owned: ownedWithCount,
      shared: sharedWithCount,
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
    const parsed = createFileSchema.safeParse(body);

    const input = parsed.success ? parsed.data : {};
    const file = await createFile({
      ownerUserId: user.id,
      title: input.title,
      language: input.language,
      contentText: input.contentText,
    });

    return NextResponse.json(file);
  } catch {
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 }
    );
  }
}
