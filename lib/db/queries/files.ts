import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { files, projects, users } from "../schema";

export async function createFile(input: {
  projectId: string;
  title?: string;
  contentText?: string;
}) {
  const now = new Date();
  const [file] = await db
    .insert(files)
    .values({
      projectId: input.projectId,
      title: input.title ?? "untitled.py",
      contentText: input.contentText ?? "",
      lastEditedAt: now,
      updatedAt: now,
    })
    .returning();
  await db
    .update(projects)
    .set({
      lastEditedAt: now,
      updatedAt: now,
    })
    .where(eq(projects.id, input.projectId));
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
      projectId: projects.id,
      projectName: projects.name,
      ownerUserId: projects.ownerUserId,
      ownerName: users.name,
      ownerUsername: users.username,
    })
    .from(files)
    .innerJoin(projects, eq(projects.id, files.projectId))
    .innerJoin(users, eq(users.id, projects.ownerUserId))
    .where(and(eq(files.id, fileId), eq(files.isDeleted, false)))
    .limit(1);
  return row ?? null;
}

export async function updateFileMetadata(
  fileId: string,
  input: { title?: string; contentText?: string }
) {
  const existing = await getFileById(fileId);
  if (!existing) {
    return null;
  }

  const updates: Partial<{
    title: string;
    contentText: string;
    lastEditedAt: Date;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.contentText !== undefined) {
    updates.contentText = input.contentText;
    updates.lastEditedAt = new Date();
  }

  const [updated] = await db
    .update(files)
    .set(updates)
    .where(eq(files.id, fileId))
    .returning();
  if (updated) {
    if (input.contentText !== undefined) {
      const now = new Date();
      await db
        .update(projects)
        .set({
          updatedAt: now,
          lastEditedAt: now,
        })
        .where(eq(projects.id, existing.projectId));
    } else {
      await db
        .update(projects)
        .set({ updatedAt: new Date() })
        .where(eq(projects.id, existing.projectId));
    }
  }
  return updated ?? null;
}

export async function softDeleteFile(fileId: string) {
  const existing = await getFileById(fileId);
  const [updated] = await db
    .update(files)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(files.id, fileId))
    .returning();
  if (updated && existing) {
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, existing.projectId));
  }
  return updated ?? null;
}
