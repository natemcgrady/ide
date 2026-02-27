import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireProjectWriteAccess,
  AccessError,
} from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries/projects";
import {
  addProjectCollaborator,
  removeProjectCollaborator,
  updateProjectCollaboratorPermission,
} from "@/lib/db/queries/collaborators";
import { findUserByEmailOrUsername } from "@/lib/db/queries/users";

const inviteSchema = z.object({
  emailOrUsername: z.string().min(1),
  permission: z.enum(["read", "write"]),
});

const removeSchema = z.object({
  userId: z.string().uuid(),
});

const updatePermissionSchema = z.object({
  userId: z.string().uuid(),
  permission: z.enum(["read", "write"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;
    await requireProjectWriteAccess(projectId, user);

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can invite collaborators" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invitedUser = await findUserByEmailOrUsername(
      parsed.data.emailOrUsername
    );
    if (!invitedUser) {
      return NextResponse.json(
        {
          error:
            "User not found. They need to sign in to the IDE at least once before you can invite them.",
        },
        { status: 404 }
      );
    }

    if (invitedUser.id === user.id) {
      return NextResponse.json(
        { error: "You cannot invite yourself" },
        { status: 400 }
      );
    }

    await addProjectCollaborator({
      projectId,
      userId: invitedUser.id,
      permission: parsed.data.permission,
      invitedByUserId: user.id,
    });

    return NextResponse.json({
      success: true,
      collaborator: {
        userId: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email,
        permission: parsed.data.permission,
      },
    });
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await params;
    await requireProjectWriteAccess(projectId, user);

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can remove collaborators" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself as owner" },
        { status: 400 }
      );
    }

    await removeProjectCollaborator(projectId, parsed.data.userId);
    return NextResponse.json({ success: true });
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

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can update permissions" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = updatePermissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await updateProjectCollaboratorPermission(
      projectId,
      parsed.data.userId,
      parsed.data.permission
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
