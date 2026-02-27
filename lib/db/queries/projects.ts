import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { files, projectCollaborators, projects, users } from "../schema";

export async function listProjectsForUser(userId: string) {
  const owned = await db
    .select({
      id: projects.id,
      name: projects.name,
      lastEditedAt: projects.lastEditedAt,
      ownerUserId: projects.ownerUserId,
      isOwner: sql<boolean>`true`,
    })
    .from(projects)
    .where(and(eq(projects.ownerUserId, userId), eq(projects.isDeleted, false)))
    .orderBy(desc(projects.lastEditedAt));

  const shared = await db
    .select({
      id: projects.id,
      name: projects.name,
      lastEditedAt: projects.lastEditedAt,
      ownerUserId: projects.ownerUserId,
      isOwner: sql<boolean>`false`,
    })
    .from(projectCollaborators)
    .innerJoin(projects, eq(projects.id, projectCollaborators.projectId))
    .where(
      and(
        eq(projectCollaborators.userId, userId),
        eq(projects.isDeleted, false)
      )
    )
    .orderBy(desc(projects.lastEditedAt));

  const ownedIds = new Set(owned.map((project) => project.id));
  const sharedFiltered = shared.filter((project) => !ownedIds.has(project.id));

  return {
    owned,
    shared: sharedFiltered,
  };
}

export async function createProject(input: {
  ownerUserId: string;
  name?: string;
}) {
  const [project] = await db
    .insert(projects)
    .values({
      ownerUserId: input.ownerUserId,
      name: input.name ?? "Untitled Project",
    })
    .returning();
  return project!;
}

export async function getProjectById(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project ?? null;
}

export async function getProjectWithOwner(projectId: string) {
  const [row] = await db
    .select({
      project: projects,
      ownerName: users.name,
      ownerUsername: users.username,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerUserId))
    .where(eq(projects.id, projectId))
    .limit(1);
  return row ?? null;
}

export async function listFilesInProject(projectId: string) {
  return db
    .select({
      id: files.id,
      projectId: files.projectId,
      title: files.title,
      contentText: files.contentText,
      lastEditedAt: files.lastEditedAt,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
    })
    .from(files)
    .where(and(eq(files.projectId, projectId), eq(files.isDeleted, false)))
    .orderBy(desc(files.lastEditedAt));
}

export async function updateProjectMetadata(
  projectId: string,
  input: { name?: string }
) {
  const updates: Partial<{
    name: string;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) {
    updates.name = input.name;
  }

  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, projectId))
    .returning();
  return updated ?? null;
}

export async function softDeleteProject(projectId: string) {
  const now = new Date();
  const [project] = await db
    .update(projects)
    .set({
      isDeleted: true,
      updatedAt: now,
    })
    .where(eq(projects.id, projectId))
    .returning();
  await db
    .update(files)
    .set({
      isDeleted: true,
      updatedAt: now,
    })
    .where(eq(files.projectId, projectId));
  return project ?? null;
}

export async function getProjectFileCount(projectId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(files)
    .where(and(eq(files.projectId, projectId), eq(files.isDeleted, false)));
  return row?.count ?? 0;
}

export async function getProjectCollaboratorCount(projectId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectCollaborators)
    .where(eq(projectCollaborators.projectId, projectId));
  return row?.count ?? 0;
}
