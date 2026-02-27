import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { fileCollaborators, files, users } from "../schema";

export type CollaboratorPermissionType =
  (typeof fileCollaborators.$inferSelect)["permission"];

export async function getFileCollaborators(fileId: string) {
  return db
    .select({
      userId: fileCollaborators.userId,
      permission: fileCollaborators.permission,
      userName: users.name,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
    .from(fileCollaborators)
    .innerJoin(users, eq(users.id, fileCollaborators.userId))
    .where(eq(fileCollaborators.fileId, fileId));
}

export async function hasFileAccess(
  fileId: string,
  userId: string,
  requiredPermission: "read" | "write"
): Promise<boolean> {
  const file = await db
    .select({ ownerUserId: files.ownerUserId })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  const [f] = file;
  if (!f) return false;
  if (f.ownerUserId === userId) return true;

  const [collab] = await db
    .select({ permission: fileCollaborators.permission })
    .from(fileCollaborators)
    .where(
      and(
        eq(fileCollaborators.fileId, fileId),
        eq(fileCollaborators.userId, userId)
      )
    )
    .limit(1);

  if (!collab) return false;
  if (requiredPermission === "read") return true;
  return collab.permission === "write";
}

export async function addCollaborator(input: {
  fileId: string;
  userId: string;
  permission: CollaboratorPermissionType;
  invitedByUserId: string;
}) {
  const [result] = await db
    .insert(fileCollaborators)
    .values({
      fileId: input.fileId,
      userId: input.userId,
      permission: input.permission,
      invitedByUserId: input.invitedByUserId,
    })
    .onConflictDoUpdate({
      target: [fileCollaborators.fileId, fileCollaborators.userId],
      set: { permission: input.permission },
    })
    .returning();
  return result ?? null;
}

export async function removeCollaborator(fileId: string, userId: string) {
  const [deleted] = await db
    .delete(fileCollaborators)
    .where(
      and(
        eq(fileCollaborators.fileId, fileId),
        eq(fileCollaborators.userId, userId)
      )
    )
    .returning();
  return deleted ?? null;
}

export async function updateCollaboratorPermission(
  fileId: string,
  userId: string,
  permission: CollaboratorPermissionType
) {
  const [updated] = await db
    .update(fileCollaborators)
    .set({ permission })
    .where(
      and(
        eq(fileCollaborators.fileId, fileId),
        eq(fileCollaborators.userId, userId)
      )
    )
    .returning();
  return updated ?? null;
}
