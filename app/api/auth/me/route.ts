import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch("https://api.vercel.com/login/oauth/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 401 });
  }

  const user = await response.json();

  return NextResponse.json({
    id: user.sub,
    name: user.name ?? null,
    email: user.email ?? null,
    username: user.preferred_username ?? null,
    avatar: user.picture ? "/api/auth/avatar" : null,
  });
}
