import { and, eq, or, desc, sql } from "drizzle-orm";
import { db } from "../client";
import { files, fileCollaborators, users } from "../schema";

export async function listFilesForUser(userId: string) {
  const owned = await db
    .select({
      id: files.id,
      title: files.title,
      language: files.language,
      lastEditedAt: files.lastEditedAt,
      ownerUserId: files.ownerUserId,
      isOwner: sql<boolean>`true`,
    })
    .from(files)
    .where(
      and(eq(files.ownerUserId, userId), eq(files.isDeleted, false))
    )
    .orderBy(desc(files.lastEditedAt));

  const shared = await db
    .select({
      id: files.id,
      title: files.title,
      language: files.language,
      lastEditedAt: files.lastEditedAt,
      ownerUserId: files.ownerUserId,
      isOwner: sql<boolean>`false`,
    })
    .from(fileCollaborators)
    .innerJoin(files, eq(files.id, fileCollaborators.fileId))
    .where(
      and(
        eq(fileCollaborators.userId, userId),
        eq(files.isDeleted, false)
      )
    )
    .orderBy(desc(files.lastEditedAt));

  const ownedIds = new Set(owned.map((f) => f.id));
  const sharedFiltered = shared.filter((f) => !ownedIds.has(f.id));

  return {
    owned,
    shared: sharedFiltered,
  };
}

export async function createFile(input: {
  ownerUserId: string;
  title?: string;
  language?: string;
  contentText?: string;
}) {
  const [file] = await db
    .insert(files)
    .values({
      ownerUserId: input.ownerUserId,
      title: input.title ?? "Untitled",
      language: input.language ?? "python",
      contentText: input.contentText ?? "",
    })
    .returning();
  return file!;
}

export async function getFileById(fileId: string) {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  return file ?? null;
}

export async function getFileWithOwner(fileId: string) {
  const [row] = await db
    .select({
      file: files,
      ownerName: users.name,
      ownerUsername: users.username,
    })
    .from(files)
    .innerJoin(users, eq(users.id, files.ownerUserId))
    .where(eq(files.id, fileId))
    .limit(1);
  return row ?? null;
}

export async function updateFileMetadata(
  fileId: string,
  input: { title?: string; language?: string; contentText?: string }
) {
  const updates: Partial<{
    title: string;
    language: string;
    contentText: string;
    lastEditedAt: Date;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.language !== undefined) updates.language = input.language;
  if (input.contentText !== undefined) {
    updates.contentText = input.contentText;
    updates.lastEditedAt = new Date();
  }

  const [updated] = await db
    .update(files)
    .set(updates)
    .where(eq(files.id, fileId))
    .returning();
  return updated ?? null;
}

export async function softDeleteFile(fileId: string) {
  const [updated] = await db
    .update(files)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(files.id, fileId))
    .returning();
  return updated ?? null;
}

export async function getCollaboratorCount(fileId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fileCollaborators)
    .where(eq(fileCollaborators.fileId, fileId));
  return row?.count ?? 0;
}
