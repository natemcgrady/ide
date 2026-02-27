import { cookies } from "next/headers";
import { upsertUserByVercelSub } from "@/lib/db/queries/users";

export interface CurrentUser {
  id: string; // internal UUID
  vercelSub: string;
  email: string | null;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return null;
  }

  const response = await fetch(
    "https://api.vercel.com/login/oauth/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    return null;
  }

  const vercelUser = await response.json();
  const vercelSub = vercelUser.sub as string;
  const avatarUrl = vercelUser.picture ? "/api/auth/avatar" : null;

  const user = await upsertUserByVercelSub({
    vercelSub,
    email: vercelUser.email ?? null,
    name: vercelUser.name ?? null,
    username: vercelUser.preferred_username ?? null,
    avatarUrl,
  });

  return {
    id: user.id,
    vercelSub: user.vercelSub,
    email: user.email,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Unauthorized");
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
