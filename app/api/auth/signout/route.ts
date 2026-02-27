import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (accessToken) {
    const credentials = `${process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID}:${process.env.VERCEL_APP_CLIENT_SECRET}`;

    await fetch("https://api.vercel.com/login/oauth/token/revoke", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
      },
      body: new URLSearchParams({ token: accessToken }),
    });
  }

  cookieStore.set("access_token", "", { maxAge: 0 });
  cookieStore.set("refresh_token", "", { maxAge: 0 });

  return Response.json({});
}
