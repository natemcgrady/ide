import { NextResponse } from "next/server";
import { requireAuth, requireFileReadAccess, FileAccessError } from "@/lib/auth";
import { getFileWithOwner } from "@/lib/db/queries/files";
import { getFileCollaborators } from "@/lib/db/queries/collaborators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await requireAuth();
    const { fileId } = await params;

    await requireFileReadAccess(fileId, user);

    const [fileRow, collaborators] = await Promise.all([
      getFileWithOwner(fileId),
      getFileCollaborators(fileId),
    ]);

    return NextResponse.json({
      owner: fileRow
        ? {
            userId: fileRow.file.ownerUserId,
            userName: fileRow.ownerName,
            userUsername: fileRow.ownerUsername,
          }
        : null,
      collaborators: collaborators.map((c) => ({
        userId: c.userId,
        userName: c.userName,
        userEmail: c.userEmail,
        userAvatarUrl: c.userAvatarUrl,
        permission: c.permission,
      })),
    });
  } catch (e) {
    if (e instanceof FileAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
