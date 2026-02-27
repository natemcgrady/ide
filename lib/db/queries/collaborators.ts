import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { files, projectCollaborators, projects, users } from "../schema";

export type CollaboratorPermissionType =
  (typeof projectCollaborators.$inferSelect)["permission"];

export async function getProjectCollaborators(projectId: string) {
  return db
    .select({
      userId: projectCollaborators.userId,
      permission: projectCollaborators.permission,
      userName: users.name,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
    .from(projectCollaborators)
    .innerJoin(users, eq(users.id, projectCollaborators.userId))
    .where(eq(projectCollaborators.projectId, projectId));
}

export async function hasProjectAccess(
  projectId: string,
  userId: string,
  requiredPermission: "read" | "write"
): Promise<boolean> {
  const project = await db
    .select({ ownerUserId: projects.ownerUserId, isDeleted: projects.isDeleted })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const [p] = project;
  if (!p || p.isDeleted) return false;
  if (p.ownerUserId === userId) return true;

  const [collab] = await db
    .select({ permission: projectCollaborators.permission })
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId)
      )
    )
    .limit(1);

  if (!collab) return false;
  if (requiredPermission === "read") return true;
  return collab.permission === "write";
}

export async function hasFileAccess(
  fileId: string,
  userId: string,
  requiredPermission: "read" | "write"
): Promise<boolean> {
  const [file] = await db
    .select({
      projectId: files.projectId,
      isDeleted: files.isDeleted,
    })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file || file.isDeleted) {
    return false;
  }

  return hasProjectAccess(file.projectId, userId, requiredPermission);
}

export async function addProjectCollaborator(input: {
  projectId: string;
  userId: string;
  permission: CollaboratorPermissionType;
  invitedByUserId: string;
}) {
  const [result] = await db
    .insert(projectCollaborators)
    .values({
      projectId: input.projectId,
      userId: input.userId,
      permission: input.permission,
      invitedByUserId: input.invitedByUserId,
    })
    .onConflictDoUpdate({
      target: [projectCollaborators.projectId, projectCollaborators.userId],
      set: { permission: input.permission },
    })
    .returning();
  return result ?? null;
}

export async function removeProjectCollaborator(projectId: string, userId: string) {
  const [deleted] = await db
    .delete(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId)
      )
    )
    .returning();
  return deleted ?? null;
}

export async function updateProjectCollaboratorPermission(
  projectId: string,
  userId: string,
  permission: CollaboratorPermissionType
) {
  const [updated] = await db
    .update(projectCollaborators)
    .set({ permission })
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId)
      )
    )
    .returning();
  return updated ?? null;
}
