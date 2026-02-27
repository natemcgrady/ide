import { eq, or, ilike } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema";

export async function findUserByVercelSub(vercelSub: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.vercelSub, vercelSub))
    .limit(1);
  return user ?? null;
}

export async function findUserByEmailOrUsername(emailOrUsername: string) {
  const search = emailOrUsername.trim();
  const [user] = await db
    .select()
    .from(users)
    .where(
      or(
        ilike(users.email, search),
        ilike(users.username, search)
      )
    )
    .limit(1);
  return user ?? null;
}

export interface UpsertUserInput {
  vercelSub: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}

export async function upsertUserByVercelSub(input: UpsertUserInput) {
  const existing = await findUserByVercelSub(input.vercelSub);
  const now = new Date();

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email: input.email ?? existing.email,
        name: input.name ?? existing.name,
        username: input.username ?? existing.username,
        avatarUrl: input.avatarUrl ?? existing.avatarUrl,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning();
    return updated!;
  }

  const [inserted] = await db
    .insert(users)
    .values({
      vercelSub: input.vercelSub,
      email: input.email ?? null,
      name: input.name ?? null,
      username: input.username ?? null,
      avatarUrl: input.avatarUrl ?? null,
    })
    .returning();
  return inserted!;
}
