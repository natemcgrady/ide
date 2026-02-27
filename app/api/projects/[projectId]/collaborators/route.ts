import { NextResponse } from "next/server";
import {
  requireAuth,
  requireProjectReadAccess,
  AccessError,
} from "@/lib/auth";
import { getProjectWithOwner } from "@/lib/db/queries/projects";
import { getProjectCollaborators } from "@/lib/db/queries/collaborators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;

    await requireProjectReadAccess(projectId, user);

    const [projectRow, collaborators] = await Promise.all([
      getProjectWithOwner(projectId),
      getProjectCollaborators(projectId),
    ]);

    return NextResponse.json({
      owner: projectRow
        ? {
            userId: projectRow.project.ownerUserId,
            userName: projectRow.ownerName,
            userUsername: projectRow.ownerUsername,
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
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
