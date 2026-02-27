import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userResponse = await fetch(
    "https://api.vercel.com/login/oauth/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!userResponse.ok) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 401 });
  }

  const user = await userResponse.json();
  if (!user?.picture) {
    return NextResponse.json({ error: "No avatar" }, { status: 404 });
  }

  const imageResponse = await fetch(user.picture, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch avatar" },
      { status: 502 }
    );
  }

  const contentType = imageResponse.headers.get("content-type") ?? "image/png";
  const buffer = await imageResponse.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
